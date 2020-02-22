import { Component, Input } from '@angular/core';

import { EventService } from 'src/app/event/shared/event.service';
import { TagModel } from 'src/app/event/shared/tag.model';
import { NavController } from '@ionic/angular';

const DEFAULT_FILTERS = [
  // {
  //   filter: 'Welche <u>kostenlosen</u> Veranstaltungen gibt es in <u>meiner Nähe</u>?',
  //   link: ['/events', { priceRange: 'free', radius: 5 }],
  // },
  // {
  //   filter: 'Welche Veranstaltungen gibt es <u>am Nachmittag</u>?',
  //   link: ['/events', { time: 'afternoon' }],
  // },
  {
    filter: 'Welche Veranstaltungen gibt es <u>für Kinder</u>?',
    link: ['/events', { targetAudience: 'Kinder' }],
  },
  {
    filter: 'Welche Veranstaltungen gibt es heute speziell <u>für Senioren</u>?',
    link: ['/events', { targetAudience: 'Senioren' }],
  },
];

@Component({
  selector: 'proto-filter-preview',
  templateUrl: './filter-preview.component.html',
  styleUrls: ['./filter-preview.component.scss'],
})
export class FilterPreviewComponent {
  @Input() public filter;
  public sentence: any;
  public tagsString;

  private _tags: { [key: string]: TagModel };

  constructor(
    private eventService: EventService,
    private navController: NavController,
  ) {
    if (!this.filter) {
      const randomIndex = Math.floor(Math.random() * DEFAULT_FILTERS.length);
      const randomFilter = DEFAULT_FILTERS[randomIndex];
      this.sentence = randomFilter;
    }

    this.eventService.getTags()
      .subscribe((tags) => {
        this._tags = {};

        for (const tag of tags) {
          this._tags[tag.id] = tag;
        }

        this.createTagsString();
      });
  }

  public ngOnChanges() {
    this.createTagsString();
  }

  public onFilterIconClicked() {
    if (this.filter) { return; }

    const queryParams = Object.assign(this.sentence.link[1], { openFilterModal: 1 });
    this.navController.navigateForward(this.sentence.link[0], { queryParams: queryParams }).catch();
  }

  private createTagsString() {
    this.tagsString = '';

    if (!this.filter || !this.filter.tags || !this._tags) { return; }

    let tagsString = '';

    this.filter.tags.forEach((tagId, i) => {
      if (i === this.filter.tags.length - 1) {
        tagsString += `${this._tags[tagId].name}`;

        return;
      }

      tagsString += `${this._tags[tagId].name}, `;
    });

    this.tagsString = tagsString;
  }
}
