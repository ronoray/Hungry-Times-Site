import { BRAND } from '../lib/constants'
import { trackWhatsAppClick } from '../utils/analytics'

export default function WhatsAppFloat() {
  const msg = encodeURIComponent('Hi! I would like to order from Hungry Times.')
  const url = `https://wa.me/${BRAND.whatsapp}?text=${msg}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppClick('floating_button')}
      aria-label="Chat on WhatsApp"
      className="fixed z-50 right-4 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] md:bottom-6 md:right-6
                 w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] active:scale-95
                 rounded-full flex items-center justify-center
                 shadow-[0_4px_20px_rgba(37,211,102,0.5)]
                 transition-all duration-200"
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.502 1.14 6.746 3.072 9.382L1.062 31.29l6.166-1.976A15.89 15.89 0 0016.004 32C24.826 32 32 24.826 32 16.004 32 7.176 24.826 0 16.004 0zm9.318 22.614c-.39 1.098-2.286 2.1-3.15 2.154-.794.05-1.534.376-5.17-1.076-4.378-1.748-7.146-6.218-7.362-6.51-.216-.29-1.766-2.348-1.766-4.478s1.118-3.178 1.514-3.614c.396-.436.864-.546 1.152-.546.288 0 .576.002.828.016.266.014.624-.1.976.746.39 1.098 1.038 2.928 1.128 3.14.09.216.15.468.03.756-.12.288-.18.468-.36.72-.18.252-.378.564-.54.756-.18.216-.368.45-.158.882.21.432.934 1.542 2.006 2.498 1.378 1.228 2.54 1.608 2.898 1.788.36.18.57.15.78-.09.21-.24.9-1.05 1.14-1.41.24-.36.48-.3.81-.18.33.12 2.094.988 2.454 1.168.36.18.6.27.69.42.09.15.09.87-.3 1.968z" />
      </svg>
    </a>
  )
}
