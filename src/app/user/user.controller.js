export class UserController{

  constructor($auth, $state, $http, API_URL){
    'ngInject';

    this.$http = $http;
    this.$state = $state;
    this.$auth = $auth;
    this.API_URL = API_URL;

    this.groups = [];
    this.users = [];
    this.currentUser = {};

    let current = this.$state.current.name;
    if(current == 'users-list') { this.getUsers(); }
    if(current == 'register') { this.getGroups(); }
    if(current == 'user-detail' ) { this.getUser(); }
    if(current == 'edit-user' ) {this.currentUserId = this.$state.params.userId;}
  }

  register(){
    this.$http.post(this.API_URL+'api/users', this.register.user)
      .then(successRes => {
        this.errorMessage = null;
        this.successMessage = successRes.data.message;
        this.register.user = {
          userId: '',
          email: '',
          password: '',
          group: '',
          role: ''
        };
        this.passwordConfirm = '';
      }, errorRes => {
        this.successMessage = null;
        this.errorMessage = errorRes.data.message;
      });
  }

  getUsers(){
    this.$http.get(this.API_URL+'api/users/')
      .then(successRes => {
        this.users = successRes.data.users;
      }, errorRes => {
        this.errorMessage = errorRes.data.message;
      });
  }

  getUser(){
    let userId = this.$state.params.userId;
    this.$http.get(this.API_URL+'api/users/'+userId)
      .then(successRes => {
        this.currentUser = successRes.data;
      }, errorRes => {
        this.errorMessage = errorRes.data.message;
      });
  }

  showUserDetail(userId){
    this.$state.go('user-detail', {userId});
  }

  editUserView(userId){
    this.$state.go('edit-user', {userId});
  }

  getAuthUser(){
    let authUser = {}
    let payload = this.$auth.getPayload();
    if(payload) { authUser = payload.user || {}; }
    return authUser;
  }

  canDeleteUser(){
    let user = this.getAuthUser();
    return user.role === 'admin' || user.role === 'sudo';
  }

  updateUser(){
    this.$http.put(this.API_URL+'api/users/'+this.currentUserId, this.edit.user)
      .then(() => {
        this.showUserDetail(this.currentUserId);
      }, errorRes => {
        this.errorMessage = errorRes.data.message;
      });
  }

  deleteUser(userId){
    if(userId == this.getAuthUser().userId){
      this.errorMessage = 'You cannot delete own account';
      return;
    }
    this.$http.delete(this.API_URL+'api/users/'+userId)
      .then(() => {
        this.$state.go('users-list');
      }, errorRes => {
        this.errorMessage = errorRes.data.message;
      });
  }

  getGroups(){
    this.$http.get(this.API_URL+'api/groups').then( successRes => {
      this.groups = successRes.data.groups || [];
    });
  }
}
