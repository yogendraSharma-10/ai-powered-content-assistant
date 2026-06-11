import React from 'react'

export default function Footer() {
  return (
    <footer className='bg-zinc-100 h-16 bottom-0 fixed w-full flex justify-end'>
      <p>
        &copy; {new Date().getFullYear()} AI Content Assistant. All rights reserved.
      </p>
    </footer>
  )
}
