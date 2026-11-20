import localFont from 'next/font/local'

// Barlow is used for body copy. Keep only the two real weights in use;
// the browser synthesizes intermediate weights instead of shipping 4+ files.
export const barlow = localFont({
  src: [
    { path: '../public/fonts/Barlow-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/Barlow-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-barlow',
})

export const bebasNeue = localFont({
  src: '../public/fonts/BebasNeue-Regular.ttf',
  weight: '400',
  display: 'swap',
  variable: '--font-bebas-neue',
})

export const permanentMarker = localFont({
  src: '../public/fonts/PermanentMarker-Regular.ttf',
  weight: '400',
  display: 'swap',
  preload: false,
  variable: '--font-permanent-marker',
})

export const jakartaSans = localFont({
  src: '../public/fonts/PlusJakartaSans-Variable.ttf',
  weight: '200 800',
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
})
