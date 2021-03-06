import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Podcast, PodcastLocation, Place, SuggestionStatus, PodcastSuggestion } from '../../models';
import { switchMap, map, tap } from 'rxjs/operators';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { MapService } from '../../../services/map.service';
import * as firebase from 'firebase/app';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'pm-podcast',
  templateUrl: './podcast.component.html',
  styleUrls: ['./podcast.component.scss']
})
export class PodcastComponent implements OnInit {

  MAX_POD_LOCATIONS = 10;

  podcast$: Observable<Podcast>;
  loading = true;
  // suggesting locations
  podPlace: Place;
  podLocations: PodcastLocation[] = [];
  submitted = false;
  collectionId: string;
  addLocationFieldVisible = false;

  constructor(
    private route: ActivatedRoute,
    private afs: AngularFirestore,
    private mapService: MapService,
    public userService: UserService
  ) { }

  ngOnInit() {
    this.podcast$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.collectionId = params.get('collectionId');
        return this.afs.doc<Podcast>(`podcasts/${this.collectionId}`).valueChanges().pipe(
          map(pod => {
            this.loading = false;
            if (pod === undefined) {
              this.addLocationFieldVisible = true;
              if (this.mapService.podcast && Number(this.collectionId) === this.mapService.podcast.collectionId) {
                return this.mapService.podcast;
              }
              return null;
            } else {
              // center on podcast's first city
              // todo - fit to bounds of multiple cities
              if (pod.locations && pod.locations.length) {
                const loc = pod.locations[0];
                const geoPoint = new firebase.firestore.GeoPoint(loc.lat, loc.lng);
                this.mapService.updatePosition(geoPoint);
                this.mapService.zoomToCity();
              }
              else if (pod.locations && !pod.locations.length) {
                this.addLocationFieldVisible = true;
              }
              return pod;
            }
          }),
          tap(() => this.resetForm())
        );
      })
    );
  }

  locationString(podcast): string {
    if (podcast.locations) {
      return (podcast.locations.length === 1) ? 'Location:' : 'Locations:';
    } else {
      return 'Locations:';
    }
  }

  // suggesting locations

  canAddPlace(): Boolean {
    return this.podLocations.length <= this.MAX_POD_LOCATIONS;
  }

  addPlaceIfUnique(place: Place): Boolean {
    this.podLocations.forEach(plc => {
      if (plc.placeId === place.place_id) {
        return false;
      }
    });
    return true;
  }

  setPlace(place: Place) { // place chosen from typeahead

    this.podPlace = place;
    if (this.addPlaceIfUnique(place) && this.canAddPlace()) {
      this.loading = true;
      this.mapService.getPlaceDetails(place.place_id)
        .then(placeDetails => {
          // console.log('place details', placeDetails);
          this.loading = false;
          const geoPoint = new firebase.firestore.GeoPoint(placeDetails.geometry.location.lat(), placeDetails.geometry.location.lng());

          this.mapService.updatePosition(geoPoint);
          this.mapService.zoomToCity();

          this.podLocations.push({
            description: place.description,
            lat: geoPoint.latitude,
            lng: geoPoint.longitude,
            placeId: placeDetails.place_id
          });

          this.addLocationFieldVisible = false;
          this.podPlace = null; // clear place search

        }, err => console.error('Error getting place details', err));
    }
  }

  addLocationText() {
    return (this.podLocations.length === 0) ? 'Suggest a location' : 'Add a location';
  }

  submitLocationSuggestion(podcast: Podcast) {
    // make a copy so we can show correct UI state
    const pod = { ...podcast, placeIds: {}};
    pod.locations = this.podLocations;
    this.podLocations.forEach(location => {
      pod.placeIds[location.placeId] = true;
    });
    const podSugg: PodcastSuggestion = {
      podcast: pod,
      status: SuggestionStatus.Unmoderated
    };

    this.afs.collection('suggestions').add(podSugg).then(() => {
      this.submitted = true;
    }, err => console.error('Firebase error:', err));
  }

  resetForm() {
    this.podLocations = [];
    this.submitted = false;
    this.podPlace = null;
  }

  encodeUrl(feedUrl: string): string {
    return encodeURIComponent(feedUrl);
  }

  removeLocation(location: PodcastLocation, isSuggestedLocation: boolean, podcast?: Podcast) {
    if (isSuggestedLocation) {
      this.podLocations = this.podLocations.filter(loc => {
        return loc.placeId !== location.placeId;
      });
      if (this.podLocations.length === 0) {
        this.addLocationFieldVisible = true;
      }
    } else {
      this.userService.isAdmin().subscribe(isAdmin => {
        if (isAdmin) {
          this.mapService.removeLocationFromPodcast(location, podcast);
        }
        else {
          alert('This action requires the admin role.');
        }
      });
    }
  }

}
