export function routerConfig ($stateProvider, $urlRouterProvider) {
  'ngInject';
  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'app/main/main.html',
      controller: 'MainController',
      controllerAs: 'main'
    })
    .state('patient-list', {
      url: '/patient-list',
      templateUrl: 'app/patient/views/list-patients.html',
      controller: 'PatientListController',
      controllerAs: 'pList'
    })
    .state('record-list', {
      url: '/record-list',
      templateUrl: 'app/record/views/list-records.html',
      controller: 'RecordListController',
      controllerAs: 'rList'
    })
    .state('record-details', {
      url: '/record-details',
      templateUrl: 'app/record/views/view-record.html',
      controller: 'RecordViewController',
      controllerAs: 'rView'
    })
    .state('register', {
      url: '/register',
      templateUrl: 'app/auth/register.html',
      controller: 'AuthController',
      controllerAs: 'auth'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'app/auth/login.html',
      controller: 'AuthController',
      controllerAs: 'auth'
    });

  $urlRouterProvider.otherwise('/');
}
