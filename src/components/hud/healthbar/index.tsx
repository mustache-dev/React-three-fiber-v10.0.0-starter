import { Html } from "@react-three/drei"
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import './style.css'

export const Healthbar = ({ position, health, healthMax }: { position: [number, number, number], health: number, healthMax: number }) => {
    const lerpRef = useRef<HTMLDivElement>(null)
    const healthRatio = health / healthMax // 0 to 1 (not percentage)

    useGSAP(() => {
        if (!lerpRef.current) return

        gsap.killTweensOf(lerpRef.current)

        gsap.to(lerpRef.current, {
            scaleX: healthRatio,
            duration: Math.random(),
            delay: Math.random() * .2,
            ease: "power4.out",
        })
    }, [healthRatio])


    return (
        <Html
            position={position}
            transform
            sprite
            style={{
                pointerEvents: 'none',
                width: '40px',
                height: '4px',
                opacity: health !== healthMax ? 1 : 0
            }}
        >
            <div className="container">
                <div className="jauge" style={{ transform: `scaleX(${healthRatio})` }} />
                <div ref={lerpRef} className="jauge-lerp" />
            </div>
        </Html>
    )
}