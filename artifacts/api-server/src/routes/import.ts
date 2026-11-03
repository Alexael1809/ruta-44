import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import zlib from "zlib";
import { db, productsTable, type InsertProduct } from "@workspace/db";
import { requireAuth, type RequestWithUser } from "./auth";

const router: IRouter = Router();

/**
 * Parses raw CSV content (comma, semicolon, or tab delimited)
 */
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter from header line
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes(";")) delimiter = ";";
  else if (firstLine.includes("\t")) delimiter = "\t";

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every((v) => v === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, "").trim() : "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Basic pure-JS XLSX worksheet text extractor from ZIP buffer
 */
function parseXlsx(buffer: Buffer): Record<string, string>[] {
  try {
    // A quick scan for strings inside uncompressed or zip inflated parts
    // Search for XML shared strings and sheet data
    const files = unzipBuffer(buffer);
    const sharedStringsXml = files["xl/sharedStrings.xml"]?.toString("utf8") || "";
    const sheetXml = files["xl/worksheets/sheet1.xml"]?.toString("utf8") || "";

    if (!sheetXml) {
      // Fallback: try reading raw buffer as UTF-8 or CSV
      return parseCsv(buffer.toString("utf8"));
    }

    // Parse shared strings table: <si><t>string</t></si>
    const sharedStrings: string[] = [];
    const siRegex = /<si>(.*?)<\/si>/gs;
    let match;
    while ((match = siRegex.exec(sharedStringsXml)) !== null) {
      const tMatches = match[1].match(/<t[^>]*>(.*?)<\/t>/gs);
      const textVal = tMatches
        ? tMatches.map((m) => m.replace(/<[^>]+>/g, "")).join("")
        : "";
      sharedStrings.push(unescapeXml(textVal));
    }

    // Parse rows from sheet1: <row r="1"><c r="A1" t="s"><v>0</v></c>...
    const rowRegex = /<row[^>]*>(.*?)<\/row>/gs;
    const rowsGrid: string[][] = [];

    while ((match = rowRegex.exec(sheetXml)) !== null) {
      const rowContent = match[1];
      const cellRegex = /<c\s+r="([A-Z]+)\d+"(?:\s+t="([^"]+)")?[^>]*>(?:<v>(.*?)<\/v>)?/gs;
      const rowArr: string[] = [];
      let cMatch;
      while ((cMatch = cellRegex.exec(rowContent)) !== null) {
        const colLetters = cMatch[1];
        const cellType = cMatch[2];
        const cellValue = cMatch[3] ?? "";
        let finalVal = cellValue;
        if (cellType === "s") {
          const sIdx = parseInt(cellValue, 10);
          finalVal = sharedStrings[sIdx] ?? cellValue;
        } else {
          finalVal = unescapeXml(cellValue);
        }
        const colIdx = colLettersToIdx(colLetters);
        while (rowArr.length < colIdx) {
          rowArr.push("");
        }
        rowArr[colIdx] = finalVal;
      }
      if (rowArr.some((v) => v !== "")) {
        rowsGrid.push(rowArr);
      }
    }

    if (rowsGrid.length === 0) return [];
    const headers = rowsGrid[0].map((h) => h.toLowerCase().trim());
    const parsedRows: Record<string, string>[] = [];

    for (let r = 1; r < rowsGrid.length; r++) {
      const rowArr = rowsGrid[r];
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = rowArr[idx] !== undefined ? rowArr[idx].trim() : "";
      });
      parsedRows.push(obj);
    }
    return parsedRows;
  } catch (err) {
    console.warn("Failed to parse as XLSX zip, falling back to CSV parse:", err);
    return parseCsv(buffer.toString("utf8"));
  }
}

function colLettersToIdx(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Minimal ZIP extractor for Node.js using native zlib
 */
function unzipBuffer(buffer: Buffer): Record<string, Buffer> {
  const result: Record<string, Buffer> = {};
  let offset = 0;

  while (offset < buffer.length - 30) {
    // Check for local file header signature: 0x04034b50 ("PK\x03\x04")
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);

    const fileNameStart = offset + 30;
    const fileName = buffer.toString("utf8", fileNameStart, fileNameStart + fileNameLength);

    const dataStart = fileNameStart + fileNameLength + extraFieldLength;
    const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

    try {
      if (compressionMethod === 0) {
        // Uncompressed
        result[fileName] = compressedData;
      } else if (compressionMethod === 8) {
        // Deflated
        result[fileName] = zlib.inflateRawSync(compressedData);
      }
    } catch {
      // Ignore unparseable entry
    }

    offset = dataStart + compressedSize;
  }

  return result;
}

/**
 * Finds value in row object by checking multiple potential header aliases
 */
function getField(row: Record<string, string>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().trim();
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().trim();
      if (normalizedKey === normalizedAlias || normalizedKey.includes(normalizedAlias)) {
        const val = row[key];
        if (val !== undefined && val !== "") return val;
      }
    }
  }
  return "";
}

/**
 * POST /products/import
 * Protected endpoint for merchants and masters to bulk import inventory via CSV or Excel
 */
router.post("/products/import", requireAuth, async (req: Request, res: Response, next) => {
  try {
    const user = (req as RequestWithUser).user;
    if (!user) {
      res.status(401).json({ error: "Debes iniciar sesión para importar productos." });
      return;
    }

    if (user.role !== "admin" && user.role !== "merchant") {
      res.status(403).json({ error: "Solo comerciantes y administradores pueden importar inventario." });
      return;
    }

    const merchantId = user.role === "admin"
      ? (req.body?.merchantId || user.merchantId)
      : user.merchantId;

    if (!merchantId) {
      res.status(400).json({ error: "No se encontró un perfil de comerciante asignado para este inventario." });
      return;
    }

    let rawBuffer: Buffer | null = null;
    let fileName = "import.csv";

    if (req.body && req.body.fileData) {
      // Base64 fileData
      const rawData = String(req.body.fileData);
      fileName = req.body.fileName || fileName;
      if (rawData.startsWith("data:")) {
        const base64Part = rawData.split(",")[1] || "";
        rawBuffer = Buffer.from(base64Part, "base64");
      } else {
        rawBuffer = Buffer.from(rawData, "base64");
      }
    } else if (typeof req.body === "string" && req.body.length > 0) {
      rawBuffer = Buffer.from(req.body, "utf8");
    } else if (req.body && req.body.csvText) {
      rawBuffer = Buffer.from(req.body.csvText, "utf8");
    }

    if (!rawBuffer || rawBuffer.length === 0) {
      res.status(400).json({ error: "No se proporcionó ningún archivo o datos para importar." });
      return;
    }

    const isExcel = fileName.endsWith(".xlsx") || rawBuffer.slice(0, 4).toString() === "PK\x03\x04";
    const rawRows = isExcel ? parseXlsx(rawBuffer) : parseCsv(rawBuffer.toString("utf8"));

    if (rawRows.length === 0) {
      res.status(400).json({ error: "El archivo está vacío o el formato no pudo ser reconocido." });
      return;
    }

    // Process and normalize rows to InsertProduct
    const validProducts: Array<{
      merchantId: string;
      sku: string;
      name: string;
      category: string;
      description: string;
      priceUsd: number;
      stock: number;
      condition: string;
      isVisible: boolean;
    }> = [];

    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const sku = getField(row, ["sku", "codigo", "código", "ref", "referencia", "item"]).trim();
      const name = getField(row, ["nombre", "name", "producto", "repuesto", "titulo", "título", "articulo", "artículo"]).trim();
      const category = getField(row, ["categoria", "categoría", "category", "cat", "rubro"]).trim() || "General";
      const brand = getField(row, ["marca", "brand", "fabricante"]).trim();
      const application = getField(row, ["aplicacion", "aplicación", "motos", "moto", "modelo", "compatibilidad"]).trim();
      const conditionRaw = getField(row, ["condicion", "condición", "condition", "estado"]).toLowerCase().trim();
      const condition = conditionRaw.includes("usad") || conditionRaw === "used" ? "used" : "new";
      
      const priceStr = getField(row, ["precio usd", "preciousd", "precio_usd", "precio", "price", "pvp", "usd"]).replace(/[$Bs.]/g, "").replace(",", ".");
      const priceUsd = parseFloat(priceStr);

      const stockStr = getField(row, ["stock", "cantidad", "cant", "qty", "existencia", "inventario"]);
      const stock = parseInt(stockStr, 10);

      const descBase = getField(row, ["descripcion", "descripción", "description", "detalle"]).trim();

      if (!sku) {
        errors.push({ row: i + 2, error: "SKU obligatorio faltante." });
        continue;
      }
      if (!name) {
        errors.push({ row: i + 2, error: `Nombre obligatorio faltante para SKU ${sku}.` });
        continue;
      }
      if (isNaN(priceUsd) || priceUsd <= 0) {
        errors.push({ row: i + 2, error: `Precio USD inválido para SKU ${sku}.` });
        continue;
      }

      // Build enriched description with brand & application if available
      const descParts: string[] = [];
      if (descBase) descParts.push(descBase);
      if (brand) descParts.push(`Marca: ${brand}`);
      if (application) descParts.push(`Aplicación: ${application}`);
      const fullDescription = descParts.join(" | ");

      validProducts.push({
        merchantId,
        sku,
        name,
        category,
        description: fullDescription,
        priceUsd: Number(priceUsd.toFixed(2)),
        stock: isNaN(stock) || stock < 0 ? 0 : stock,
        condition,
        isVisible: true,
      });
    }

    if (validProducts.length === 0) {
      res.status(400).json({
        error: "No se encontraron filas válidas en el archivo.",
        details: errors,
      });
      return;
    }

    // Insert or update batch into productsTable
    await db.transaction(async (tx) => {
      for (const prod of validProducts) {
        await tx
          .insert(productsTable)
          .values({
            merchantId: prod.merchantId,
            sku: prod.sku,
            name: prod.name,
            category: prod.category,
            description: prod.description,
            priceUsd: prod.priceUsd,
            stock: prod.stock,
            condition: prod.condition,
            isVisible: prod.isVisible,
          })
          .onConflictDoUpdate({
            target: [productsTable.merchantId, productsTable.sku],
            set: {
              name: sql`excluded.name`,
              category: sql`excluded.category`,
              description: sql`excluded.description`,
              priceUsd: sql`excluded.price_usd`,
              stock: sql`excluded.stock`,
              condition: sql`excluded.condition`,
              updatedAt: new Date(),
            },
          });
      }
    });

    res.json({
      success: true,
      importedCount: validProducts.length,
      errorsCount: errors.length,
      errors: errors.slice(0, 10),
      sample: validProducts.slice(0, 3),
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: error.message || "Error al procesar el archivo de importación." });
  }
});

export default router;
