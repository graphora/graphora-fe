export class Vector {
  constructor(public readonly dx: number, public readonly dy: number) {}

  static zero() {
    return new Vector(0, 0)
  }

  static fromPoints(p1: { x: number, y: number }, p2: { x: number, y: number }) {
    return new Vector(p2.x - p1.x, p2.y - p1.y)
  }

  add(other: Vector): Vector {
    return new Vector(this.dx + other.dx, this.dy + other.dy)
  }

  subtract(other: Vector): Vector {
    return new Vector(this.dx - other.dx, this.dy - other.dy)
  }

  scale(factor: number): Vector {
    return new Vector(this.dx * factor, this.dy * factor)
  }

  magnitude(): number {
    return Math.sqrt(this.dx * this.dx + this.dy * this.dy)
  }

  normalize(): Vector {
    const magnitude = this.magnitude()
    if (magnitude === 0) {
      return Vector.zero()
    }
    return this.scale(1 / magnitude)
  }

  perpendicular(): Vector {
    return new Vector(-this.dy, this.dx)
  }

  angle(): number {
    return Math.atan2(this.dy, this.dx)
  }

  toString(): string {
    return `Vector(${this.dx}, ${this.dy})`
  }
} 