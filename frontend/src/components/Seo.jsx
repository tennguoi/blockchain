import React from 'react'
import { Helmet } from 'react-helmet-async'

export default function Seo({
  title,
  description,
  canonical,
  image,
  noindex = false,
}) {
  const fullTitle = title ? `${title} | BlockCert` : 'BlockCert'
  const desc =
    description ||
    'BlockCert - Hệ thống xác minh và quản lý văn bằng số bằng công nghệ Blockchain.'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      {image ? <meta property="og:image" content={image} /> : null}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image ? <meta name="twitter:image" content={image} /> : null}
    </Helmet>
  )
}

