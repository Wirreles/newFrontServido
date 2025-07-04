// Utility function to check if an image has a white background
export const hasWhiteBackground = (imageFile: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.crossOrigin = "anonymous"

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)

      if (!ctx) {
        resolve(false)
        return
      }

      // Sample pixels from the edges to check background
      const samplePoints = [
        // Top edge
        { x: 0, y: 0 },
        { x: Math.floor(img.width / 2), y: 0 },
        { x: img.width - 1, y: 0 },
        // Bottom edge
        { x: 0, y: img.height - 1 },
        { x: Math.floor(img.width / 2), y: img.height - 1 },
        { x: img.width - 1, y: img.height - 1 },
        // Left edge
        { x: 0, y: Math.floor(img.height / 2) },
        // Right edge
        { x: img.width - 1, y: Math.floor(img.height / 2) },
        // Corners
        { x: 0, y: 0 },
        { x: img.width - 1, y: 0 },
        { x: 0, y: img.height - 1 },
        { x: img.width - 1, y: img.height - 1 },
      ]

      let whitePixelCount = 0
      const threshold = 240 // RGB values above this are considered "white"

      for (const point of samplePoints) {
        const imageData = ctx.getImageData(point.x, point.y, 1, 1)
        const [r, g, b] = imageData.data

        // Check if pixel is close to white
        if (r >= threshold && g >= threshold && b >= threshold) {
          whitePixelCount++
        }
      }

      // If at least 80% of sampled edge pixels are white, consider it white background
      const whitePercentage = whitePixelCount / samplePoints.length
      resolve(whitePercentage >= 0.8)
    }

    img.onerror = () => resolve(false)
    img.src = URL.createObjectURL(imageFile)
  })
}

// Utility function to validate video file
export const isValidVideoFile = (file: File): boolean => {
  const validVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
  const maxSizeInMB = 50 // 50MB limit
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024

  return validVideoTypes.includes(file.type) && file.size <= maxSizeInBytes
}

// Utility function to get video duration
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject(new Error("Error loading video"))
    }

    video.src = URL.createObjectURL(file)
  })
}
