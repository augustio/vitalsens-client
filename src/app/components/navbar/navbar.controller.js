export class NavbarController{
    constructor($auth, $state){
        'ngInject';

        this.$auth = $auth;
        this.$state = $state;
        this.isAuthenticated = $auth.isAuthenticated;
    }

    logout(){
        this.$auth.logout();
        this.$state.go('login');
    }

    canManageUser(){
      let user = this.getAuthUser();
      return user.role === 'admin' || user.role === 'sudo';
    }

    getAuthUser(){
      let authUser = {};
      let payload = this.$auth.getPayload();
      if(payload){
        authUser = payload.user;
      }
      return authUser;
    }

    openNavMenu(){
      let nav = document.getElementById('vs-navbar');
      if(nav.className === 'navbar'){
        nav.className += ' responsive';
      }else{
        nav.className = 'navbar';
      }
    }
}
