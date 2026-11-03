import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { optionalUser, requireAuth, type RequestWithUser } from "./auth";

const router: IRouter = Router();

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function parseServiceAccountJson(): ServiceAccountCredentials | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
  } catch (e) {
    console.error("Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:", e);
  }
  return null;
}

/**
 * Creates an RS256 signed JWT assertion for Google OAuth2 token exchange
 */
function createGoogleJwt(credentials: ServiceAccountCredentials): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
    aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(credentials.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedToken}.${signature}`;
}

/**
 * Exchanges JWT for a short-lived Google OAuth2 access token
 */
async function getGoogleAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const assertion = createGoogleJwt(credentials);
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Uploads a file buffer to Google Drive using multipart upload and makes it publicly readable
 */
export async function uploadToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<{ webViewLink: string; fileId: string }> {
  const credentials = parseServiceAccountJson();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!credentials) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_JSON not set. Using base64 data URI fallback.");
    // Fallback for development/testing when Drive credentials aren't supplied
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;
    return {
      webViewLink: dataUri,
      fileId: `local-${Date.now()}`,
    };
  }

  const accessToken = await getGoogleAccessToken(credentials);

  // 1. Multipart upload to Google Drive v3
  const boundary = `-------314159265358979323846`;
  const metadata: Record<string, unknown> = {
    name: `comprobante-${Date.now()}-${fileName}`,
    mimeType,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}`
    ),
    Buffer.from(`${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
    Buffer.from(buffer.toString("base64")),
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(multipartBody.length),
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errText}`);
  }

  const fileData = (await uploadRes.json()) as { id: string; webViewLink?: string };
  const fileId = fileData.id;

  // 2. Set public reader permissions (anyone can view)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });
  } catch (permErr) {
    console.warn("Could not set public permission on Drive file:", permErr);
  }

  const webViewLink =
    fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  return {
    webViewLink,
    fileId,
  };
}

/**
 * POST /payments/upload-receipt
 * Accepts either:
 * 1. JSON payload: { fileData: "base64...", fileName: "...", mimeType: "..." }
 * 2. Raw binary buffer with content-type
 */
router.post("/payments/upload-receipt", optionalUser, async (req: Request, res: Response, next) => {
  try {
    let fileBuffer: Buffer | null = null;
    let fileName = "comprobante.jpg";
    let mimeType = "image/jpeg";

    if (req.body && req.body.fileData) {
      // Base64 JSON payload
      const rawData = String(req.body.fileData);
      fileName = req.body.fileName || fileName;
      mimeType = req.body.mimeType || mimeType;

      if (rawData.startsWith("data:")) {
        const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], "base64");
        } else {
          fileBuffer = Buffer.from(rawData.split(",")[1] || rawData, "base64");
        }
      } else {
        fileBuffer = Buffer.from(rawData, "base64");
      }
    } else if (Buffer.isBuffer(req.body)) {
      fileBuffer = req.body;
      mimeType = req.headers["content-type"] || mimeType;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({ error: "No se proporcionó ningún archivo de comprobante válido." });
      return;
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: "El archivo es demasiado grande (máximo 10 MB)." });
      return;
    }

    const { webViewLink, fileId } = await uploadToGoogleDrive(fileBuffer, fileName, mimeType);

    res.json({
      success: true,
      webViewLink,
      fileId,
    });
  } catch (error: any) {
    console.error("Receipt upload error:", error);
    res.status(500).json({ error: error.message || "Error al subir comprobante a Google Drive." });
  }
});

export default router;
