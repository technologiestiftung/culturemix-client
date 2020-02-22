import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';

import { AuthService } from 'src/app/auth/shared/auth.service';
import { C } from 'src/app/@shared/constants';
import { HideSplash } from 'src/app/@shared/hide-splash.decorator';
import { ToastService } from 'src/app/@core/toast.service';
import { TranslateService } from '@ngx-translate/core';

@HideSplash()
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  public registerForm: FormGroup;
  public emailTaken = false;
  public isLoading = false;
  public passwordMinLength = C.validation.passwordMinLength;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private navController: NavController,
    private toastService: ToastService,
    private translate: TranslateService,
  ) {
    this.registerForm = this.formBuilder.group({
      email: ['', Validators.compose([Validators.pattern(C.regex.email), Validators.required])],
      password: ['', Validators.compose([Validators.required, Validators.minLength(C.validation.passwordMinLength)])],
      privacyConsent: [false],
    });
  }

  public ngOnInit() {
  }

  public register() {
    if (!this.registerForm.valid || this.isLoading) { return; }

    this.isLoading = true;

    const registerData = {
      username: this.registerForm.value.username,
      email: this.registerForm.value.email.toLowerCase(),
      password: this.registerForm.value.password,
    };

    this.authService.register(registerData).then(() => {
      return this.onRegistrationSucceeded();
    }, (err) => {
      return this.onRegistrationFailed(err);
    }).catch(() => {
      this.isLoading = false;
      this.toastService.show(this.translate.instant('TOAST.GENERIC_ERROR.MESSAGE'), false).catch();
    });
  }

  public formIsValid() {
    return this.registerForm.valid && this.consentsValid();
  }

  public consentsValid() {
    return this.registerForm.value.privacyConsent;
  }

  private onRegistrationSucceeded() {
    this.isLoading = false;
    this.navController.navigateRoot('/')
      .then(() => {
        this.toastService.show(this.translate.instant('TOAST.REGISTER_SUCCESS.MESSAGE'), true).catch();
      })
      .catch();
  }

  private onRegistrationFailed(err: any) {
    this.isLoading = false;

    if (err && err.status === C.status.unprocessableEntity &&
      this.getUnprocessableEntityMessage(err).includes('Email already exists')) {
      this.emailTaken = true;

      return this.toastService.show(this.translate.instant('TOAST.EMAIL_EXISTS.MESSAGE'), false).catch();
    }

    this.toastService.show(this.translate.instant('TOAST.GENERIC_ERROR.MESSAGE'), false).catch();
  }

  private getUnprocessableEntityMessage(data: any): string {
    try {
      return data.error.error.message;
    }
    catch (catchErr) {
      return '';
    };
  }
}
