import { Component, computed, effect, input, linkedSignal, output, signal } from '@angular/core';
import { RenderedObject } from '../types';
import { form, FormField } from '@angular/forms/signals';
import { from } from 'rxjs';

interface LoginData {
  email: string;
  password: string;
}


@Component({
  selector: 'app-object-props-editor',
  imports: [FormField],
  template: `
<form class="flex flex-col">

  <label>
    Name:
    <input  [formField]="objForm.name" />
  </label>

  <span class="text-[1.2rem]">Position</span>
  <div class="flex gap-2">
    <label>
      X:
      <input type="number" [formField]="objForm.position[0]" />
    </label>
    <label>
      Y:
      <input type="number" [formField]="objForm.position[1]" />
    </label>
  </div>

  <label>
    Rotation:
    <input type="number" [formField]="objForm.rotation" />
  </label>


  <label>
    Display Bounding Box:
    <input type="checkbox" [formField]="objForm.showBoundingBox" />
  </label>

  <label>
    Color:
    <input type="color" [formField]="objForm.color" />
  </label>

</form>


  `
})
export class ObjectPropsEditor {

  objChanged = output<RenderedObject>()

  obj = input.required<RenderedObject>()
  objLocal = linkedSignal(() => this.obj());
  objForm = form(this.objLocal);

  constructor() {
    effect(() => {

      const obj = this.obj()
      const objLocal = this.objLocal()
      if (obj === objLocal) { return }

      console.log("EMIT FORM CHANGE");

      this.objChanged.emit(objLocal)

    })
  }
}