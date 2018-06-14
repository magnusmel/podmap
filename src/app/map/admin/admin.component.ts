import { Component } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import { Router } from '@angular/router';
import { AngularFirestore } from 'angularfire2/firestore';
import { PodcastSuggestion, SuggestionStatus } from '../models';
import { Observable } from 'rxjs';

@Component({
  selector: 'pm-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {

  suggestions: Observable<PodcastSuggestion[]>;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore
  ) {
    // get unmoderated suggestions
    this.suggestions = afs.collection<PodcastSuggestion>('suggestions', ref => {
      return ref.where('status', '==', SuggestionStatus.Unmoderated);
    }).valueChanges();
  }

  approve(suggestion: PodcastSuggestion) {
    // todo
    console.log('approve', suggestion);

    // this.afs.doc(`podcasts/${suggestion.podcast.collectionId}`).set()
    // this.afs.doc(`locations/${podLocation.placeId}`).set(podLocation);
  }

  reject(suggestion: PodcastSuggestion) {
    // todo
    console.log('reject', suggestion);
  }

  signOut() {
    console.log('bye');
    this.afAuth.auth.signOut();
    this.router.navigateByUrl('/search');
  }

}