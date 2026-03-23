import { Component, input } from '@angular/core';
import { RenderedObject } from '../types';

@Component({
  selector: 'app-scene-object-list',
  imports: [],
  host: {
    class: 'bg-gray-500 flex flex-col w-full'
  },
  template: `
  @let objects = renderedObjects();

  <div>
    Scene Objects {{objects.length}}
  </div>

  <div class="px-4 bg-blue-200">
    @for (obj of objects; track $index) {

      <div>
        <span>{{obj.name}}</span>
      </div>
    }
  </div>
  `
})
export class SceneObjectList {

  renderedObjects = input.required<RenderedObject[]>()

}
