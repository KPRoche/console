import { useState, useEffect } from 'react'

interface QASMFile {
  name: string
  size?: number
}

interface UseQASMFilesResult {
  files: QASMFile[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useQASMFiles(): UseQASMFilesResult {
  const [files, setFiles] = useState<QASMFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/qasm/listfiles', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch QASM files (${response.status})`)
      }

      const data = await response.json()
      const fileList: QASMFile[] = Array.isArray(data) ? data : data.files || []
      setFiles(fileList)
    } catch (err) {
      console.error('Error fetching QASM files:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch QASM files')
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  return { files, isLoading, error, refetch: fetchFiles }
}
