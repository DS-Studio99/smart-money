'use client'
import Image from 'next/image'

export default function Watermark() {
    const whatsappUrl = "https://wa.me/8801791125621?text=Hi, Samrat! I am using your Money Manager app."

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="watermark-container"
            title="Message Samrat on WhatsApp"
        >
            <div className="watermark-content">
                <div className="watermark-avatar">
                    <Image
                        src="/samrat-avatar.png"
                        alt="Samrat Baidya"
                        width={24}
                        height={24}
                        className="watermark-img"
                    />
                </div>
                <span className="watermark-text">Made By Samrat Baidya</span>
            </div>
        </a>
    )
}
