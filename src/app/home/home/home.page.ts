import { Component, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { EventModel } from 'src/app/event/shared/event.model';
import { EventService } from 'src/app/event/shared/event.service';
import { GeolocationService } from 'src/app/@core/geolocation.service';
import { HideSplash } from 'src/app/@shared/hide-splash.decorator';
import { TagModel } from 'src/app/event/shared/tag.model';

const EVENT_LIMIT = 3;

@HideSplash()
@Component({
  selector: 'page-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  public tags: TagModel[];
  public eventsByTag: { [key: string]: EventModel[] } = {};
  public highlightedEvents: EventModel[];
  public currentPosition: Position;

  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(
    private eventService: EventService,
    private geolocationService: GeolocationService,
  ) { }

  public ngOnInit() {
    this.eventService.getTags()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(async (tags) => {
        this.tags = tags;

        for (const tag of tags) {
          this.eventService.getEventsByTag(tag.id, EVENT_LIMIT).toPromise().then((events) => {
            this.eventsByTag[tag.id] = events;
          }).catch((error) => {
            console.error(error);
          });
        }
      });

    this.eventService.getHighlightedEvents()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((events) => {
        this.highlightedEvents = events;
      });

    this.geolocationService.getCurrentPosition()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((currentPosition) => {
        this.currentPosition = currentPosition;
      });
  }

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
