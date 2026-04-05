// Allows TypeScript to resolve CSV files imported as raw text strings via esbuild
declare module '*.csv' {
  const content: string
  export default content
}
