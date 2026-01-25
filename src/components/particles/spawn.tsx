import { VFXParticles } from "../VFXParticles"
import { OctahedronGeometry } from "three/webgpu"

export const Spawn = () => {
    return (
        <>
            <VFXParticles
            name="spawn"
            autoStart={false}
                geometry={new OctahedronGeometry(0.5, 1)}
                maxParticles={1000}
                position={[0, 0, 0]}
                emitCount={6}
                // delay={2}
                size={[0.08, 0.47]}
                fadeSize={[0.2, 1]}
                colorStart={["#ffffff", "#a4a4a4", "#323232"]}
                fadeOpacity={[1, 0]}
                fadeOpacityCurve={{
                    points: [
                        {
                            pos: [0, 0.5],
                            handleOut: [0.33, 0]
                        },
                        {
                            pos: [0.46633544921875, 0.5],
                            handleIn: [-0.1, 0],
                            handleOut: [0.1, 0]
                        },
                        {
                            pos: [1, 0],
                            handleIn: [-0.16705268488681685, 0.2845933949903017]
                        }
                    ]
                }}
                gravity={[0, 0, 0]}
                speed={[0.35, 1.43]}
                lifetime={1}
                velocityCurve={{
                    points: [
                        {
                            pos: [0, 1],
                            handleOut: [0, 0]
                        },
                        {
                            pos: [1, 0.13301116943359376],
                            handleIn: [-0.58, 0]
                        }
                    ]
                }}
                startPosition={[[0, 0], [0, 0], [0, 0]]}
                startPositionAsDirection={true}
                rotation={[[-3.4, 6.7], [-7.6, 6.7], [-5.4, 6.4]]}
                rotationSpeed={[[-6.3, 5.9], [-5.9, 6], [-6.6, 6]]}
                rotationSpeedCurve={{
                    points: [
                        {
                            pos: [0, 1],
                            handleOut: [0, 0]
                        },
                        {
                            pos: [1, 0],
                            handleIn: [-0.58, 0]
                        }
                    ]
                }}
                appearance="gradient"
                blending={1}
                lighting="basic"
                emitterShape={4}
                emitterRadius={[0, 0.03]}
                emitterAngle={0.7853981633974483}
                emitterHeight={[0, 1]}
                emitterDirection={[0, 1, 0]}
                emitterSurfaceOnly={true}
            />
        </>
    )
}