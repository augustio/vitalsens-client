export class AuthController{

  constructor($auth, $state){
    'ngInject';

    this.$auth = $auth;
    this.$state = $state;
  }
  register(){
    this.$auth.signup(this.user)
      .then(() => this.$state.go('home'))
      .catch(res => {
        const data = res.data;
        if(data){
          this.message = res.data.message;
        }
      });
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
