import { TextureLoader, RepeatWrapping, NearestFilter } from 'three/webgpu'

export const voronoiTexture = new TextureLoader().load('./voronoi.png')
voronoiTexture.wrapS = voronoiTexture.wrapT = RepeatWrapping
voronoiTexture.minFilter = voronoiTexture.magFilter = NearestFilter
