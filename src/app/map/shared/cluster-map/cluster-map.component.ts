import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { Router } from '@angular/router';

import { GeolocationService } from 'src/app/@core/geolocation.service';
import { environment } from 'src/environments/environment';

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
};

@Component({
  selector: 'proto-cluster-map',
  templateUrl: './cluster-map.component.html',
  styleUrls: ['./cluster-map.component.scss'],
})
export class ClusterMapComponent implements OnInit {
  @Input() public data: any = EMPTY_GEOJSON;
  @Input() public currentPosition: Position;
  @ViewChild('map', { static: true }) public mapWrapper: ElementRef;

  public map: mapboxgl.Map;
  public popup: mapboxgl.Popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: true,
  });
  public mapLoaded = false;

  constructor(
    private geolocationService: GeolocationService,
    private router: Router,
  ) { }

  public ngOnInit() {

    this.geolocationService.getCurrentPosition().subscribe((position: Position) => {
      if (position && !position.coords) { return; }
      this.currentPosition = position;
    })

    this.mapWrapper.nativeElement.addEventListener('click', (event) => {
      if (!event.target || !event.target.classList.contains('location-link') || !event.target.dataset.entityId) { return;  }

      this.router.navigate(['/locations', event.target.dataset.entityId]).catch();
    });

    // https://stackoverflow.com/a/44393954
    Object.getOwnPropertyDescriptor(mapboxgl, 'accessToken').set(environment.mapboxAccessToken);

    setTimeout(() => {
      this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v10',
        center: [13.395296, 52.524577], // tslint:disable-line
        zoom: 13,
      });

      this.map.on('load', () => {
        this.mapLoaded = true;

        // set position sticky after map dimensions have set
        const wrapperOfMapWrapper: HTMLElement = this.mapWrapper.nativeElement.parentNode.parentNode;

        if (wrapperOfMapWrapper) {
          wrapperOfMapWrapper.classList.add('is-sticky');
        }

        this.map.addSource('points', {
          type: 'geojson',
          data: this.data || { type: 'FeatureCollection', features: [] },
          cluster: true,
        });

        this.map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#000093',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20, // tslint:disable-line
              100, // tslint:disable-line
              30,  // tslint:disable-line
              750, // tslint:disable-line
              40, // tslint:disable-line
              1000, // tslint:disable-line
              40, // tslint:disable-line
            ],
          },
        });

        this.map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'points',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#fff',
          },
        });

        this.map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'points',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#000093',
            'circle-radius': 4,
            'circle-stroke-width': 15,
            'circle-stroke-color': 'transparent',
          },
        });
      });

      this.map.on('click', 'clusters', (e) => {

          const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0].properties.cluster_id;

          const pointsSource: any = this.map.getSource('points');
          pointsSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) { return; }

            const geometry: any = features[0].geometry;

            this.map.easeTo({
              center: geometry.coordinates,
              zoom: zoom,
            });
          });
      });

      this.map.on('mouseenter', 'clusters', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });

      this.map.on('mouseleave', 'clusters', () => {
        this.map.getCanvas().style.cursor = '';
      });

      this.map.on('mouseenter', 'unclustered-point', (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
      });

      this.map.on('click', 'unclustered-point', (e) => {
        const geometry: any = e.features[0].geometry;
        const properties = e.features[0].properties;
        const coordinates = geometry.coordinates.slice();

	while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) { // tslint:disable-line
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360; // tslint:disable-line
        }

        const distance = this.calculateDistance(coordinates[0], coordinates[1]);

        this.popup.setLngLat(coordinates)
          .setHTML(
            `<img src="./assets/icons/close2-inverted.svg" class="map-icon map-icon--close"/>
	    <a data-entity-id="${properties.id}" class="location-link">${properties.title} <img data-entity-id="${properties.id}" src="./assets/icons/chevron-next-inverted.svg" class="map-icon map-icon--next"/></a>
	    <p class="teaser">${distance ? `Entfernung: ca. ${distance} km` : ''}</p> ${ properties.eventCount > 0 ? '<a data-entity-id="' + properties.id + '" class="event-link" href="/locations/' + properties.id + '#related">' + properties.eventCount + ' Veranstaltungen <img data-entity-id="' + properties.id + '" src="./assets/icons/chevron-next-inverted.svg" class="map-icon map-icon--next"/></a>' : '' }`)
          .addTo(this.map);
      });

      this.map.on('mouseleave', 'unclustered-point', (e) => {
        this.map.getCanvas().style.cursor = '';
      });

    }, 1);
  }

  public ngOnChanges() {
    if (!this.mapLoaded) { return; }

    const pointsSource: any = this.map.getSource('points');

    pointsSource.setData(this.data);
  }

  public zoomIn() { this.map.zoomIn(); }

  public zoomOut() { this.map.zoomOut(); }

  public locate() {
    if (!this.currentPosition || !this.currentPosition.coords || !this.currentPosition.coords.longitude || !this.currentPosition.coords.latitude) { return; }

    this.map.flyTo({
      center: [
        this.currentPosition.coords.longitude,
        this.currentPosition.coords.latitude,
      ],
    });
  }

  private calculateDistance(endLng: number, endLat: number) {
    if (!this.currentPosition) { return; }

    const startLng = this.currentPosition.coords.longitude;
    const startLat = this.currentPosition.coords.latitude;

    return this.geolocationService.calculateDistance(startLng, startLat, endLng, endLat);
  }

}
