/* global malarkey:false, moment:false */

import { config } from './index.config';
import { routerConfig } from './index.route';
import { runBlock } from './index.run';
import { MainController } from './main/main.controller';
import { AuthController } from './auth/auth.controller';
import { NavbarController } from './components/navbar/navbar.controller';
import { CompareToDirective } from './directives/compareTo.directive';
import { PatientController } from './patient/controllers/patient.controller';
import { PatientRecordController } from './patient/controllers/patient.record.controller';
import { RecordController } from './record/controllers/record.controller';
import { RecordComponentsController } from './record/controllers/record.components.controller';
import { RecordComponentsDetailController } from './record/controllers/record.components.detail.controller';
import { GithubContributorService } from '../app/components/githubContributor/githubContributor.service';
import { WebDevTecService } from '../app/components/webDevTec/webDevTec.service';
import { NavbarDirective } from '../app/components/navbar/navbar.directive';
import { MalarkeyDirective } from '../app/components/malarkey/malarkey.directive';

angular.module('vitalsens', ['ui.router', 'ui.bootstrap', 'toastr', 'satellizer', 'nvd3'])
  .constant('API_URL', 'http://52.210.133.58:5000/')
  .constant('malarkey', malarkey)
  .constant('moment', moment)
  .config(config)
  .config(routerConfig)
  .run(runBlock)
  .service('githubContributor', GithubContributorService)
  .service('webDevTec', WebDevTecService)
  .controller('MainController', MainController)
  .controller('AuthController', AuthController)
  .controller('NavbarController', NavbarController)
  .controller('PatientController', PatientController)
  .controller('PatientRecordController', PatientRecordController)
  .controller('RecordController', RecordController)
  .controller('RecordComponentsController', RecordComponentsController)
  .controller('RecordComponentsDetailController', RecordComponentsDetailController)
  .directive('acmeNavbar', NavbarDirective)
  .directive('acmeMalarkey', MalarkeyDirective)
  .directive('compareTo', CompareToDirective);
