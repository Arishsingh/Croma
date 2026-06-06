import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const assetsDir = join(process.cwd(), 'dist', 'assets')
const files = await readdir(assetsDir)

for (const file of files) {
  if (!file.includes('-loader-') || !file.endsWith('.js')) continue
  const path = join(assetsDir, file)
  const content = await readFile(path, 'utf8')
  const patched = content.replace(
    /\}\)\(\)\s*\.\s*catch\s*\(\s*console\s*\.\s*error\s*\)/g,
    '})().catch(() => {})'
  )
  if (patched !== content) {
    await writeFile(path, patched)
    console.log(`Patched: ${file}`)
  }
}
