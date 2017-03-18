export function routerConfig ($stateProvider, $urlRouterProvider) {
  'ngInject';
  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'app/main/main.html',
      controller: 'MainController',
      controllerAs: 'main'
    })
    .state('patient', {
      url: '/patient',
      templateUrl: 'app/patient/views/patient.html',
      controller: 'PatientController',
      controllerAs: 'patient'
    })
    .state('patient.record', {
      url: '/patient-record',
      params:{
          patientId: null
      },
      templateUrl: 'app/patient/views/patient.record.html',
      controller: 'PatientRecordController',
      controllerAs: 'pRecord'
    })
    .state('record', {
      url: '/record',
      templateUrl: 'app/record/views/record.html',
      controller: 'RecordController',
      controllerAs: 'record'
    })
    .state('record-components', {
      url: '/record-components',
      params:{
          timeStamp: null,
          patientId: null,
          type: null
      },
      templateUrl: 'app/record/views/record.components.html',
      controller: 'RecordComponentsController',
      controllerAs: 'rComponents'
    })
    .state('record-components-detail', {
      url: '/record-components-detail',
      params:{
          _id: null
      },
      templateUrl: 'app/record/views/record.components.detail.html',
      controller: 'RecordComponentsDetailController',
      controllerAs: 'rDetail'
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
