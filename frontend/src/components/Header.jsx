import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Header() {
    const navigate = useNavigate()
  return (
    <header className='top-0 bg-zinc-100 h-16 flex fixed w-full flex-col justify-center items-center'>
      <h1>AI-Powered Content Assistant</h1>
      <button className='border-2 block' onClick={()=>navigate("/summary")}>Go to summary</button>
    </header>
  )
}
