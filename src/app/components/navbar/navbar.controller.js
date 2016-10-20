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
    
    isAdmin(){
        return this.$auth.getPayload().user.role === "admin";
    }
    
    getUser(){
        this.userEmail = this.$auth.getPayload().user.email;
        return this.userEmail != null;
    }
}