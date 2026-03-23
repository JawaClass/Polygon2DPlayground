import { ThisReceiver, TmplAstSwitchExhaustiveCheck } from '@angular/compiler';
import { AfterViewInit, Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { setThrowInvalidWriteToSignalError } from '@angular/core/primitives/signals';
import { RouterOutlet } from '@angular/router';
import { Polygon, RenderedObject, Point, Line } from './types';
import { ObjectPropsEditor } from './object-props-editor/object-props-editor';
import { SceneObjectList } from "./scene-object-list/scene-object-list";


function polygonIntersect(polygon: Polygon, test: Polygon) {
  
}


function assert(assertion: boolean, message?: string) {
  if (!assertion) {
    const m = message ?? "Assertion failed"
    alert(m)
  }
}

function slope(line: Line) {
  const [p1, p2] = line
  const [x1, y1] = p1
  const [x2, y2] = p2

  return (y2 - y1) / (x2 - x1)

}

function linesIntersect(line: Line, test: Line) {
  /* y=mx+b
  if line intersects test:
  m1*x1+b1=m2*x2+b2
  which means x1 == x2 and y1 == y2
  so we have
  m1*x+b1=m2*x+b2
  => x = (b2 - b1) / (m1 - m2)
  */
  const m1 = slope(line)
  const m2 = slope(test)

  const b1 = line[0][1] - m1 * line[0][0]
  const b2 = test[0][1] - m2 * test[0][0]

  if (Math.abs(m1 - m2) < Number.EPSILON) {
    // check overlap
    if (Math.abs(b1 - b2) > Number.EPSILON) { return false }

    const xOverlaps = Math.max(line[0][0], test[0][0]) <= Math.min(line[1][0], test[1][0])
    return xOverlaps

  }
  // 
  const x = (b2 - b1) / (m1 - m2)
  const y1 = m1 * x + b1;
  const y2 = m2 * x + b2;

  const intersects = x >= Math.min(line[0][0], line[1][0]) && x <= Math.max(line[0][0], line[1][0])

  const intersectsTest = x >= Math.min(test[0][0], test[1][0]) && x <= Math.max(test[0][0], test[1][0])
  const intersectsY1 = y1 >= Math.min(line[0][1], line[1][1]) && y1 <= Math.max(line[0][1], line[1][1])
  const intersectsY2 = y2 >= Math.min(test[0][1], test[1][1]) && y2 <= Math.max(test[0][1], test[1][1])
  return intersects && intersectsY1 && intersectsY2 && intersectsTest
}

function pointInRectangle(point: [number, number], rectangle: Polygon) {
  /* Only checks unrotated rectangle*/
  assert(rectangle.length == 4, "not a Rectangle")

  const [px, py] = point;
  const xs = rectangle.map(([x]) => x);
  const ys = rectangle.map(([, y]) => y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return px >= minX && px <= maxX && py >= minY && py <= maxY;

}

function checkBoundingBoxCollision(bb: Polygon, test: Polygon) {
  /* Only checks unrotated bounding boxes*/
  assert(bb.length == 4, "bb not a Bounding Box")
  assert(test.length == 4, "test not a Bounding Box")

  // check if top left point is in test
  if (pointInRectangle([bb[0][0], bb[0][1]], test)) return true
  // check if top right point is in test
  if (pointInRectangle([bb[1][0], bb[1][1]], test)) return true
  // check if bottom left point is in test
  if (pointInRectangle([bb[2][0], bb[2][1]], test)) return true
  // check if bottom right point is in test
  if (pointInRectangle([bb[3][0], bb[3][1]], test)) return true
  return false
}


function translatePolygon(o: {
  origin: [number, number],
  position: [number, number],
  rotation: number,
  shape: Polygon
}): Polygon {
  const [ox, oy] = o.origin;
  const [px, py] = o.position;
  const rot = o.rotation * Math.PI / 180
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  return o.shape.map(([x, y]) => {
    // Translate to origin
    const lx = x - ox;
    const ly = y - oy;
    // Rotate
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    // Translate back + apply position
    return [rx + ox + px, ry + oy + py];
  });
}

function pointOnSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number],
  threshold = 5  // in same units as your coordinates
): boolean {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  // Nearest point on segment to p, clamped to [0, 1]
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));

  const nearestX = ax + t * dx;
  const nearestY = ay + t * dy;

  const distSq = (px - nearestX) ** 2 + (py - nearestY) ** 2;
  return distSq <= threshold * threshold;
}


function pointOnPolygonEdge(
  point: [number, number],
  polygon: Polygon
): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (pointOnSegment(point, polygon[i], polygon[j])) return true;
  }
  return false;
}


function pointInPolygon(point: [number, number], polygon: Polygon): boolean {

  if (pointOnPolygonEdge(point, polygon))
    return true

  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersects = (yi > py) !== (yj > py)
      && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;


    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInCircle(point: [number, number], center: [number, number], radius: number): boolean {
  const [px, py] = point;
  const [cx, cy] = center;
  return Math.hypot(px - cx, py - cy) <= radius;
}

function resizePolygon(polygon: Polygon, factor: number) {

  return polygon.map(([x, y]) => [x * factor, y * factor]) as Polygon

}

function boundingBoxPolygon(polygon: Polygon): Polygon {
  const x = polygon.map(p => p[0])
  const y = polygon.map(p => p[1])
  const minX = Math.min(...x)
  const maxX = Math.max(...x)
  const minY = Math.min(...y)
  const maxY = Math.max(...y)
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ]
}



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ObjectPropsEditor, SceneObjectList],
  styleUrl: './app.css',
  template: `
  @let selectedObj = selectedObjectUI();

  
  <div class="flex w-full"> 
    <canvas #canvas
    class="bg-red-200"
    [width]="width" [height]="height"></canvas>

  <div class="flex flex-col w-full">

    <app-scene-object-list [renderedObjects]="renderedObjetsUI()"/>

    @if (selectedObj) {
      <app-object-props-editor
      [obj]="selectedObj"
      (objChanged)="applyEditorChanges($event)"
      />
    }
  </div>

  </div>
  
  `,

})
export class App implements AfterViewInit {
  protected readonly title = signal('2dObjectEditor');

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas")

  applyEditorChanges(changes: RenderedObject) {
    if (!this.selectedObject) { return }
    Object.assign(this.selectedObject, changes);
  }

  width = 1200
  height = 800

  objectInstantiationCounter = 0

  ctx!: CanvasRenderingContext2D

  isMouseDown = false

  selectedObject: RenderedObject | null = null
  rotatingObject: RenderedObject | null = null
  rotationLastAngle: number | null = null
  renderedObjects: RenderedObject[] = []

  selectedObjectChanged = signal(false)


  renderedObjectsChanged = signal(false)

  clicksAfterRotation = 0

  selectedObjectUI = computed(() => {
    this.selectedObjectChanged()
    if (!this.selectedObject) return null
    return { ...this.selectedObject }
  })


  checkCollission(obj: RenderedObject) {

    const shapeObj = translatePolygon(obj)
    const bb = boundingBoxPolygon(shapeObj)

    for (const other of this.renderedObjects) {
      if (other === obj) continue

      const shapeOther = translatePolygon(other)
      const bbOther = boundingBoxPolygon(shapeOther)
      if (checkBoundingBoxCollision(bb, bbOther)) {
        console.log("Bounding Boxes collides", obj.name, other.name, bb, bbOther, bb === bbOther)

        const linesCollison = linesIntersect(shapeObj as any, shapeOther as any)
        console.log("linesCollision", linesCollison);

      }
    }
  }

  renderedObjetsUI = computed(() => {
    this.renderedObjectsChanged()
    return [...this.renderedObjects]
  })
  ngAfterViewInit(): void {

    const canvas = this.canvas().nativeElement

    if (!canvas) {
      throw Error("Why no canvas")
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw Error("Why no ctx")
    }

    this.ctx = ctx
    this.onReady()


    document.addEventListener("keydown", (e) => {
      const keyUpper = e.key.toLocaleUpperCase()
      if (keyUpper == "ESCAPE") {
        this.selectedObject = null
        this.rotatingObject = null
        for (const o of this.renderedObjects) {
          o.selected = false
          o.originSelected = false
        }
        this.selectedObjectChanged.update(v => !v)
      }

      if (e.ctrlKey) {
        if (keyUpper === "C") {
          if (this.selectedObject) {
            this.addSceneObject(
              { ...this.selectedObject }
            )
          }

        }
      }

      if (keyUpper === "DELETE") {
        if (this.selectedObject)
          this.deleteSceneObject(this.selectedObject)
      }

    })

    canvas.addEventListener("mousemove", (e) => {

      const mouseDelta = [e.movementX, e.movementY]
      const mousePoint = [e.x, e.y]

      const mouseDistance = Math.abs(mouseDelta[0]) + Math.abs(mouseDelta[1])
      if (this.rotatingObject) {

        const origin = [this.rotatingObject.position[0] + this.rotatingObject.origin[0], this.rotatingObject.position[1] + this.rotatingObject.origin[1]]


        const dx = mousePoint[0] - origin[0]
        const dy = mousePoint[1] - origin[1]

        const angle = Math.atan2(dy, dx)
        if (this.rotationLastAngle !== null) {
          const dAngle = this.rotationLastAngle - angle
          const rotDelta = dAngle < 0 ? 1 : -1
          this.rotatingObject.rotation += rotDelta * (mouseDistance * 0.2)
          this.rotatingObject.rotation = Math.round(this.rotatingObject.rotation % 360)
        }
        this.rotationLastAngle = angle

        this.selectedObjectChanged.update(v => !v)


        this.checkCollission(this.rotatingObject)

        return
      }


      if (!this.isMouseDown) { return }

      if (this.selectedObject) {
        const o = this.selectedObject

        this.selectedObject.position = [o.position[0] + mouseDelta[0], o.position[1] + mouseDelta[1]]


        this.checkCollission(this.selectedObject)

        this.selectedObjectChanged.update(v => !v)
      }

    })



    canvas.addEventListener("mouseup", () => {
      this.isMouseDown = false
    })

    canvas.addEventListener("mousedown", (e) => {

      const isLeftMouseCLick = e.button === 0
      if (!isLeftMouseCLick) { return }

      this.isMouseDown = true


      this.clicksAfterRotation += 1
      if (this.clicksAfterRotation == 1 && this.rotatingObject) {

        this.rotatingObject = null
        for (const o of this.renderedObjects) {
          o.originSelected = false
        }

        return
      }

      const mouse: [number, number] = [e.x, e.y]

      // clear
      this.selectedObject = null
      this.rotatingObject = null
      for (const o of this.renderedObjects) {
        o.selected = false
        o.originSelected = false
      }

      // select object
      for (const o of this.renderedObjects) {

        const polygon = translatePolygon(o);

        const inside = pointInPolygon([...mouse], polygon)
        const originPos: [number, number] = [o.origin[0] + o.position[0], o.origin[1] + o.position[1]
        ]

        const insideOrigin = pointInCircle(mouse, originPos, 10)

        if (insideOrigin) {
          this.rotatingObject = o
          this.selectedObject = o
          o.selected = true
          o.originSelected = true
          this.clicksAfterRotation = 0

          this.selectedObjectChanged.update(v => !v)
          return
        }

        if (inside) {
          o.selected = true
          this.selectedObject = o

          this.selectedObjectChanged.update(v => !v)
          return
        }


      }

      this.selectedObjectChanged.update(v => !v)

    })

  }

  deleteSceneObject(obj: RenderedObject) {

    this.renderedObjects = this.renderedObjects.filter(o => o !== obj)

    this.renderedObjectsChanged.update(v => !v)
  }

  addSceneObject(obj: {
    shape: Polygon
    color?: string
    name?: string
    origin?: [number, number]
    position?: [number, number]
    rotation?: number
  }) {

    const name = obj.name ?? "Object"
    this.renderedObjects.push(
      {
        ...obj,
        name: `Scene.${name}.${this.objectInstantiationCounter}`,// "Scene.Object." + this.objectInstantiationCounter,
        selected: false,
        originSelected: false,
        showBoundingBox: false,
        color: obj.color ?? "blue",
        origin: obj.origin ?? [0, 0],
        position: [this.width / 2, this.height / 2],
        rotation: obj.rotation ?? 0,
      }
    )

    this.objectInstantiationCounter++;
    this.renderedObjectsChanged.update(v => !v)
  }

  onReady() {

    this.renderScene()
    setInterval(() => {
      this.renderScene()
    }, 1000 / 30)
  }
  constructor() {
    const box: RenderedObject = {
      shape: resizePolygon([
        [0.0200, -0.0346],
        [0.8733, -0.5273],
        [0.7498, -0.7413],
        [0.0200, -0.7413]
      ], 300),
      color: "#e7ef7e",
      origin: [0, 0],
      position: [this.width / 2, this.height / 2],
      rotation: 90,
      name: "hahahaha",
      originSelected: false,
      selected: false,
      showBoundingBox: false
    }
    this.addSceneObject(box)



    this.addSceneObject({
      shape: [
        [0, 0], [200, 200]
      ]

    })
  }

  drawPolygon(polygon: Polygon) {
    const ctx = this.ctx
    ctx.beginPath();
    const [[x0, y0], ...rest] = polygon

    ctx.moveTo(x0, y0)
    for (const [x, y] of rest) {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  }


  drawOrigin(o: RenderedObject) {
    const [ox, oy] = [o.position[0] + o.origin[0], o.position[1] + o.origin[1]];

    const ctx = this.ctx
    ctx.beginPath();
    const radius = 10
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.fillStyle = o.originSelected ? "yellow" : "white";
    ctx.fill();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (o.originSelected) {
      ctx.beginPath();
      ctx.arc(ox, oy, 50, 0, Math.PI * 2);
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  renderScene() {
    const sceneObjects = this.renderedObjects

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height);


    for (const o of sceneObjects) {

      const polygon = translatePolygon(o)

      this.drawPolygon(polygon)

      ctx.fillStyle = o.color
      ctx.fill()
      ctx.strokeStyle = o.selected ? "blue" : "black";
      ctx.lineWidth = 2;
      ctx.stroke();

      this.drawOrigin(o)

      if (o.showBoundingBox) {

        const bb = boundingBoxPolygon(polygon)
        this.drawPolygon(bb)

        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.stroke();
      }


    }


  }
}
