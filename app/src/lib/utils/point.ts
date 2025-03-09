import { Vector } from './vector'

export class Point {
  constructor(public readonly x: number, public readonly y: number) {}

  static origin() {
    return new Point(0, 0)
  }

  static fromVector(vector: Vector) {
    return new Point(vector.dx, vector.dy)
  }

  translate(vector: Vector): Point {
    return new Point(this.x + vector.dx, this.y + vector.dy)
  }

  vectorTo(other: Point): Vector {
    return new Vector(other.x - this.x, other.y - this.y)
  }

  distanceTo(other: Point): number {
    return this.vectorTo(other).magnitude()
  }

  equals(other: Point): boolean {
    return this.x === other.x && this.y === other.y
  }

  toString(): string {
    return `Point(${this.x}, ${this.y})`
  }
} 