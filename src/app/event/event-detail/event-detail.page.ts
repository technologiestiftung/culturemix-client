import { ToastService } from './../../@core/toast.service';
import { UserService } from 'src/app/user/shared/user.service';
import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import * as moment from 'moment';

import { C } from 'src/app/@shared/constants';
import { EventModel } from '../shared/event.model';
import { EventService } from '../shared/event.service';
import { GeolocationService } from 'src/app/@core/geolocation.service';
import { HideSplash } from 'src/app/@shared/hide-splash.decorator';
import { environment } from 'src/environments/environment';
import { IonContent, ToastController, IonSlides } from '@ionic/angular';

const TIMEOUT = 1000;
const HEADER_HEIGHT = 82;

@HideSplash()
@Component({
  selector: 'page-event-detail',
  templateUrl: './event-detail.page.html',
  styleUrls: ['./event-detail.page.scss'],
})
export class EventDetailPage implements OnInit {
  @ViewChild('slides', { static: false }) public slides: IonSlides;
  @ViewChild(IonContent, { static: false }) public content: IonContent;
  @ViewChild('relatedEvents', { static: false }) public related: ElementRef;

  public culturematchUrl = C.urls.culturematch;

  public initialized = false;
  public id: string;
  public event: EventModel;
  public mapImage = '';
  public bvgUrl = '';
  public gmapsUrl = '';
  public distance: string;
  public currentPosition: Position;
  public imageSliderOptions: any = {
    loop: true,
  };
  public tags = '';

  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor(
    private activatedRoute: ActivatedRoute,
    private eventService: EventService,
    private geolocationService: GeolocationService,
    private sanitizer: DomSanitizer,
    private userService: UserService,
  ) { }

  // TODO: Refactor into smaller pieces, better yet into own Service
  public addToCalendar() {

    function formatString(str: string) {
      return str.replace(/\n/g, " ");
    }

    const date = {
      start: this.event.dates[0].date.from,
      end: this.event.dates[0].date.to,
    };
    const attendee = {
      email: this.userService.getCurrentUser() && this.userService.getCurrentUser().email ? this.userService.getCurrentUser().email : null,
    }
    const organizer = {
      name: formatString(this.event.venue.general.name) || null,
      email: this.event.venue.address.email || null,
    };
    const location = {
      name: formatString(this.event.venue.general.name) || null,
    };
    const event = {
      isPermanent: this.event.isPermanent,
      summary: this.event.title ? formatString(this.event.title) : null,
      description: this.event.description ? formatString(this.event.description) : null,
    }

    let icsFileString  = `BEGIN:VCALENDAR\n`;
        icsFileString += `VERSION:2.0\n`;
        icsFileString += `PRODID:-//CULTUREMIX//NONSGML v1.0//EN\n`;
        icsFileString += `BEGIN:VEVENT\n`;
        icsFileString += `UID:${ this.event.id }\n`;
        icsFileString += `DTSTAMP:${ moment.utc(new Date().toISOString()).format('YYYYMMDD[T]HHmmss') }\n`;
    if (event.isPermanent) {
      icsFileString += `DTSTART;VALUE=DATE:${ moment.utc(date.start).format('YYYYMMDD') }\n`;
      icsFileString += `DTEND;VALUE=DATE:${ moment.utc(date.end).format('YYYYMMDD') }\n`;
    } else {
      icsFileString += `DTSTART:${ moment.utc(date.start).format('YYYYMMDD[T]HHmmss') }\n`;
      icsFileString += `DTEND:${ moment.utc(date.end).format('YYYYMMDD[T]HHmmss') }\n`;
    }
    if (attendee.email) {
      icsFileString += `ATTENDEE;CN=${ attendee.email }:MAILTO:${ attendee.email }\n`;
    }
    if (organizer.name) {
      icsFileString += `ORGANIZER;CN=${ organizer.name }`;
    }
    if (organizer.email) {
      icsFileString += `:MAILTO:${ organizer.email }\n`;
    }
    if (location.name) {
      icsFileString += `LOCATION:${ location.name }\n`;
    }
    if (event.summary) {
      icsFileString += `SUMMARY:${ event.summary }\n`;
    }
    if (event.description) {
      icsFileString += `DESCRIPTION:${ event.description }\n`;
    }
    icsFileString += `END:VEVENT\n`;
    icsFileString += `END:VCALENDAR`;

    const blob = new Blob([icsFileString], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'event.ics';
    link.click();

  }

  public ngOnInit() {
    this.id = this.activatedRoute.snapshot.params.id;

    this.eventService.getEventById(this.id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((event) => {
        this.event = event;
        this.setMapData();
        this.calculateDistance();

        this.tags = this.event.tags
          .map((tag: any) => tag.name)
          .join(', ');
      });

    this.geolocationService.getCurrentPosition()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((currentPosition) => {
        this.currentPosition = currentPosition;

        this.calculateDistance();
      });
  }

  public ionViewDidEnter() {
    if (this.initialized) { return; }

    this.initialized = true;
  }

  public trackByFunction(index: number, item: any) {
    return item ? item.id : index;
  }

  public getVideoIframe(htmlString: string) {
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  public async slideNext() {
    this.slides.slideNext().catch();
  }

  public async slidePrevious() {
    this.slides.slidePrev().catch();
  }

  public scrollToRelated() {
    const y = this.related.nativeElement.getBoundingClientRect().top;
    this.content.scrollToPoint(0, y - HEADER_HEIGHT).catch();
  }

  private setMapData() {
    if (!this.event.venue) { return ''; }

    const COORDINATES_ARRAY_LENGTH = 2;
    if (this.event.venue.location.coordinates.length !== COORDINATES_ARRAY_LENGTH) { return''; }

    const width = 748;
    const height = 260;
    const lat = this.event.venue.location.coordinates[1];
    const lng = this.event.venue.location.coordinates[0];
    const zoom = 13;

    this.mapImage = `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s(${lng},${lat})/${lng},${lat},${zoom}/${width}x${height}?access_token=${environment.mapboxAccessToken}`

    if (!this.event.venue.address) { return; }
    const zip = this.event.venue.address.zipcode ? ' ' + this.event.venue.address.zipcode : '';
    const city = this.event.venue.address.city ? ' ' + this.event.venue.address.city : '';
    const street = this.event.venue.address.street ? ' ' + this.event.venue.address.street : '';

    this.gmapsUrl = this.fixedEncodeURI(`https://www.google.com/maps/dir/?api=1&destination=${zip}${city}${street}`);
    this.bvgUrl = this.fixedEncodeURI(`https://fahrinfo.bvg.de/?to=${zip}${city}${street}`);
  }

  private fixedEncodeURI(str: string): string {
    return encodeURI(str).replace(/%5B/g, '[').replace(/%5D/g, ']');
  }

  private calculateDistance() {
    if (!this.event || !this.currentPosition) { return; }

    if (this.event.venue && this.event.venue.location && this.event.venue.location.coordinates) {
      const startLng = this.currentPosition.coords.longitude;
      const startLat = this.currentPosition.coords.latitude;
      const endLng = this.event.venue.location.coordinates[0];
      const endLat = this.event.venue.location.coordinates[1];

      this.distance = this.geolocationService.calculateDistance(startLng, startLat, endLng, endLat);
    }
  }
}
