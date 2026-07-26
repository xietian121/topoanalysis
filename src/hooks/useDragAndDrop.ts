import { useState, useCallback, useRef } from 'react'

interface UseDragAndDropOptions {
  acceptFormats: string[]
  onFilesAccepted: (files: File[]) => void
}

interface UseDragAndDropReturn {
  isDragOver: boolean
  dropZoneProps: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  getInputProps: () => {
    type: string
    multiple: boolean
    accept: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  }
}

export function useDragAndDrop({
  acceptFormats,
  onFilesAccepted,
}: UseDragAndDropOptions): UseDragAndDropReturn {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  const isValidFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return acceptFormats.includes(ext)
  }

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter(isValidFile)
      if (validFiles.length > 0) {
        onFilesAccepted(validFiles)
      }
    },
    [acceptFormats, onFilesAccepted],
  )

  const dropZoneProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current++
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true)
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDragOver(false)
      }
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      dragCounter.current = 0
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
  }

  const getInputProps = () => ({
    type: 'file',
    multiple: true,
    accept: acceptFormats.join(','),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
        e.target.value = ''
      }
    },
  })

  return { isDragOver, dropZoneProps, getInputProps }
}
