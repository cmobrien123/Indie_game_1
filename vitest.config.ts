import { defineConfig } from 'vitest/config'
import { readFileSync } from 'fs'
import { Plugin } from 'vite'

const csvPlugin = (): Plugin => ({
  name: 'csv-loader',
  transform(_code: string, id: string) {
    if (id.endsWith('.csv')) {
      const content = readFileSync(id, 'utf-8')
      return { code: `export default ${JSON.stringify(content)}` }
    }
  },
})

export default defineConfig({
  plugins: [csvPlugin()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
