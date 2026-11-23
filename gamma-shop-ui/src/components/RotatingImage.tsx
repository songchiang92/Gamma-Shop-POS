import { useEffect, useState } from 'react'
import { imageUrl } from '../api/client'
import type { ProductImageResponse } from '../api/types'

const ROTATE_MS = 10_000

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Cycles through a product's photos every 10s, sliding horizontally between them. */
export function RotatingImage({
  images,
  alt,
  height,
  onClick,
}: {
  images: ProductImageResponse[]
  alt: string
  height: number
  onClick?: () => void
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
    if (images.length < 2) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [images])

  if (images.length === 0) return null

  return (
    <div
      style={{ position: 'relative', width: '100%', height, overflow: 'hidden', cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          width: `${images.length * 100}%`,
          height: '100%',
          transform: `translateX(-${index * (100 / images.length)}%)`,
          transition: prefersReducedMotion ? 'none' : 'transform 0.7s cubic-bezier(0.65, 0, 0.35, 1)',
        }}
      >
        {images.map((img) => (
          <img
            key={img.id}
            src={imageUrl(img.imageUrl)}
            alt={alt}
            className="card-img-top"
            style={{ width: `${100 / images.length}%`, height: '100%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
          />
        ))}
      </div>
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
          {images.map((img, i) => (
            <span
              key={img.id}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
