export class NavbarController{
    constructor($auth, $state){
        'ngInject';
        
        this.$auth = $auth;
        this.$state = $state;
        this.isAuthenticated = $auth.isAuthenticated;
    }
    
    logout(){
        this.$auth.logout();
        this.$state.go('home');
    }
}