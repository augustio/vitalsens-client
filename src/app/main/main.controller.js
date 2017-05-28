export class MainController {
  constructor($auth, $state){
    'ngInject';

    this.$auth = $auth;
    this.$state = $state;

    this.authUser = this.$auth.getPayload().user;
    let token = this.$auth.getToken();
    if(!token) { this.$state.go('login'); }
  }
}
