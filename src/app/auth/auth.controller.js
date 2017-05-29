export class AuthController{

  constructor($auth, $state, $http, API_URL){
    'ngInject';

    this.$http = $http;
    this.$state = $state;
    this.$auth = $auth;
    this.API_URL = API_URL;
  }

  login(){
    this.$auth.login(this.login.user)
      .then(res => {
        this.$auth.setToken(res.data.token);
        this.$state.go('home');
      }).catch(response => {
        const data = response.data;
        if(data){
          this.message = response.data.message;
        }
      });
  }
}
