
export type Polygon = Point[]

export interface RenderedObject {
    shape: Polygon
    color: string
    colorPrevious: string
    name: string
    origin: Point
    position: Point
    rotation: number
    selected: boolean
    originSelected: boolean
    showBoundingBox: boolean
    collisions: RenderedObject[]
}

export type Point = [number, number]

export type Line = [Point, Point]