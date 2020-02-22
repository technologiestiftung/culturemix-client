import { Component, OnInit, ViewChild } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IonContent, ModalController, NavController } from '@ionic/angular';
import { ModalOptions } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';

import { AppHelper } from 'src/app/@shared/app-helper';
import { EVENT_DUMMY_DATA } from '../shared/event.model';
import { EventFilterPage } from 'src/app/event/event-filter/event-filter.page';
import { EventService, Events } from '../shared/event.service';
import { GeolocationService } from 'src/app/@core/geolocation.service';
import { HideSplash } from 'src/app/@shared/hide-splash.decorator';
import { LocationService, LocationsAsGeoJSON } from 'src/app/location/shared/location.service';

const MIN_WIDTH_SPLITVIEW = 720;

@HideSplash()
@Component({
  selector: 'page-event-list',
  templateUrl: './event-list.page.html',
  styleUrls: ['./event-list.page.scss'],
})
export class EventListPage implements OnInit {
  @ViewChild('ListContent', { static: true }) public content: IonContent;
  public events: Events = {
    items: EVENT_DUMMY_DATA,
    meta: { isFirstLoad: true, isLoading: true },
  };
  public currentLang: string;
  public currentSection = window.innerWidth >= MIN_WIDTH_SPLITVIEW ? 'both' : 'list';
  public locationsAsGeoJson: LocationsAsGeoJSON;
  public currentPosition: Position;
  public filter: any = {};

  private ngUnsubscribe: Subject<any> = new Subject();
  private refresherEvent: any;
  private searchResultsLoading = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private eventService: EventService,
    private geolocationService: GeolocationService,
    private locationService: LocationService,
    private modalController: ModalController,
    private navController: NavController,
    private translate: TranslateService,
  ) {
    this.currentLang = this.translate.currentLang;

    // We basically just wait to get the translations loaded
    this.translate.get('TERM.LANGUAGE')
      .subscribe(() => { this.geolocationService.init().catch(); });
  }

  public ngOnInit() {
    const queryParams = this.activatedRoute.snapshot.queryParams;

    if (!AppHelper.isEmptyObject(queryParams)) {
      this.filter = this.queryParamsToFilter(queryParams);
      this.eventService.setFilter(this.filter);

      if (queryParams.openFilterModal && parseInt(queryParams.openFilterModal) === 1) {
        requestAnimationFrame(() => {
          this.openFilterModal().catch();
        })
      }
    }

    this.locationService.getLocationsAsGeoJson()
      .subscribe((geojson) => {
        this.locationsAsGeoJson = geojson;
      });

    this.eventService.getEvents()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((events: Events) => {
        this.events.meta = events.meta;

        if (this.events.meta.isLoading) { return; }

        this.events.items = events.items;

        if (this.searchResultsLoading) {
          this.searchResultsLoading = false;
          this.content.scrollToTop(0).catch();
        }

      });

    this.activatedRoute.queryParams
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((queryParams) => {
        this.filter = this.queryParamsToFilter(queryParams || {});
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

  public refresh(event: any) {
    this.refresherEvent = event;
    this.eventService.refreshEvents();
  }

  public loadMore(event: any) {
    this.eventService.getMoreEvents();
  }

  public toggleMap() {
    this.currentSection = this.currentSection === 'both' ? 'list' : 'both';
  }

  public async openFilterModal() {
    const modal = await this.modalController.create({
      component: EventFilterPage,
      componentProps: {
        whereFilter: JSON.parse(JSON.stringify(this.events.meta.whereFilter)),
        orderBy: JSON.parse(JSON.stringify(this.events.meta.orderBy)),
      },
      cssClass: 'filter-modal',
    } as ModalOptions);

    return await modal.present();
  }

  public trackByFunction(index: number, item: any) {
    return item ? item.id : index;
  }

  private queryParamsToFilter(queryParams: any) {
    const filter: any = {};

    if (queryParams.tags) {
      filter.tags = queryParams.tags.split(',');
    }

    if (queryParams.targetAudience) {
      filter.targetAudience = queryParams.targetAudience.split(',');
    }

    if (queryParams.priceRange) {
      filter.priceRange = queryParams.priceRange.split(',');
    }

    if (queryParams.near) {
      filter.near = {
        lat: queryParams.near.split(',')[0],
        lng: queryParams.near.split(',')[1],
      };
    }

    if (queryParams.radius) {
      filter.radius = queryParams.radius;
    }

    if (queryParams.time) {
      filter.time = queryParams.time.split(',');
    }

    if (queryParams.dateFrom) {
      filter.dateFrom = queryParams.dateFrom;
    }

    if (queryParams.dateTo) {
      filter.dateTo = queryParams.dateTo;
    }

    return filter;
  }
}
