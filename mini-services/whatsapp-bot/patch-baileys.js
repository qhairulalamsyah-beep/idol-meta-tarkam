/**
 * patch-baileys.js — Fix Baileys pino logger compatibility
 * 
 * Problem: Baileys noise-handler.js does `logger = logger.child({ class: 'ns' })`
 * but pino v10 under Bun/Node sometimes returns undefined from .child(),
 * making `logger` undefined and crashing the bot.
 *
 * Fix: Guard the .child() call and fallback to console if logger is broken.
 * Also replaces logger.trace() and logger.debug() with logger.info()
 * since pino v10 doesn't have those methods.
 */

const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  __dirname,
  "node_modules/@whiskeysockets/baileys/lib/Utils/noise-handler.js"
);

try {
  let content = fs.readFileSync(targetFile, "utf8");

  // 1. Replace logger.trace() → logger.info() (pino v10 has no trace)
  content = content.replace(/logger\.trace\(/g, "logger.info(");

  // 2. Replace logger.debug() → logger.info() (pino v10 has no debug)
  content = content.replace(/logger\.debug\(/g, "logger.info(");

  // 3. Guard the logger.child() call — fallback to console if it breaks
  const oldLine = "logger = logger.child({ class: 'ns' });";
  const newLine = [
    "try { logger = logger.child({ class: 'ns' }); } catch(_e) { logger = console; }",
    "if (typeof logger !== 'object' || typeof logger.info !== 'function') { logger = console; }",
  ].join("\n");
  content = content.replace(oldLine, newLine);

  fs.writeFileSync(targetFile, content);
  console.log("[patch-baileys] ✅ Baileys noise-handler patched successfully");
  console.log("[patch-baileys]    - logger.trace() → logger.info()");
  console.log("[patch-baileys]    - logger.debug() → logger.info()");
  console.log("[patch-baileys]    - logger.child() guarded with console fallback");
} catch (err) {
  console.log("[patch-baileys] ⚠️ Patch failed:", err.message);
  console.log("[patch-baileys] The bot may crash. Check if @whiskeysockets/baileys is installed.");
}
