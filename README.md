# ionic-blueprint Readme
This project was made with ❤️ in Berlin by the great team at [prototype.berlin GmbH](https://www.prototype.berlin/).

As the names says this project serves as a setup for scaffolding a new app. All you need is to follow the Table of Contents eh voilà your new app is ready to build and use. All the necessary key features are already there.

## Table of Contents
1. Setup & Build/Release
2. Architecture overview
3. Development
4. Known issues

## 1. Setup & Build/Release
### 1.1 Prerequisites
Ideally, you will use a Unix-based operating system, e.g. macOS or Ubuntu.

Follow the respective platform guides, [Cordova iOS](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/) and [Cordova Android](https://cordova.apache.org/docs/en/latest/guide/platforms/android/), to set your machine up for building the native versions.

For Ionic development, Node.js is required, ideally the LTS which has the major version number 10 at the time of writing.  We recommend using [NVM](https://github.com/creationix/nvm) for easy management of node versions.

List
- Node.js 10.16.3 (LTS)
- npm 6.9.0
- Cordova 8
- Ionic 4

Aftern setting up Node.js, npm should also be ready. Install Cordova and Ionic globally

```
npm install -g cordova@8 ionic@4
```

### 1.2 Install project dependencies
Run the following commands in the root directory of the project to install all project dependencies.

```
npm install
ionic cordova prepare ios
ionic cordova prepare android
```

## Push notifications
- Make sure google-services.json and GoogleService-Info.plist are in the project root and being copied to the platforms
- Add `notification.png` to `resources/android/`.
- You can configure the notification icon color on Android in `config.xml`.

### 1.3 Release Procedures
Make sure, you replace `${APP_NAME}` and `${TEAM}` in the following instructions.

For both platforms, iOS and Android, run the following command to create release builds that point to the production servers.

```
bin/production-build.sh
```

#### 1.3.1 iOS
You must have a valid iOS distribution certificate installed on your machine, that allows your Apple Developer Account to build the bundle id used by the app. Check the Apple Developer Program for more information.

After you have run the build script above, follow these steps:
1. Open the XCode Workspace `platforms/ios/${APP_NAME}.xcworkspace`
2. Click on *Product* -> *Archive*
3. Click on *Export*
4. Choose wether you want symbols to upload or not, click on *Next*
5. Choose "Automatically manage signing", click on *Next*
6. Click on *Export*
7. Save Archive
8. The resulting `${APP_NAME}.ipa` can be uploaded to iTunes Connect

#### 1.3.2 Android
##### Keystore Information
If you did not receive a keystore and password, make sure, you generate a keystore and keep it in a safe location. If you lose this, you cannot upload updates to the Google Play Store for this bundle id anymore and need to create a new app.

```
keytool -genkey -v -keystore ${APP_NAME}-production.keystore -alias ${APP_NAME}_production -keyalg RSA -keysize 2048 -validity 10000
```

##### Steps
After you have run the build script above, follow these steps:
```
# Enter APK directory
cd platforms/android/build/outputs/apk/
# Sign the build with the keystore, enter password for keystore when prompted
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ${APP_NAME}-production.keystore android-release-unsigned.apk ${APP_NAME}_production
# Deleted signed and aligned APK if it exists
rm -f ${APP_NAME}.apk
# Align APK for Release
~/work/tools/android-sdk-macosx/build-tools/28.0.0/zipalign -v 4 android-release-unsigned.apk ${APP_NAME}.apk
```
The resulting `${APP_NAME}.apk` can be uploaded to the Google Play Store

## 2. Architecture overview
### 2.1 API endpoint
The app connects to a server-side API, swagger docs of the endpoints are available under the /explore endpoint in non-production environments, e.g. here: https://app-staging.example.com/explorer/

### 2.2 Patterns
#### 2.2.1 Data architecture
We strive to use immutable data structures with RxJS.

We use Observables for data that is read-only, such as getting a list of articles. That Observable is updated from the a service only.

We use Promises for operations, e.g. liking an article. The corresponding service must then take care of updating e.g. the article observable to reflect changes.

#### 2.2.2 Modules
We strive to encapsulate functionality into modules with clear responsibility. Those modules can then be used where they are needed.

Modules have a `shared/` folder that most of the time provides a *Service* and a *Module* to be used for interaction, but also templates used by other modules.

#### 2.2.3 Singleton Services
Because we use want immutable states we must take care to only use services as singletons. That's why services from **all** modules are provided by the *CoreModule* and not their respective modules.

*This is crucial for bug free operation*, otherwise some data might not be updated as expected.

### 2.3 File structure
Most relevant folders:
```
src/
	app/
		@core/			# Provide your new services here
		@native/		# Ionic native is provided from here
		@shared/		# Application-wide components
		auth/			# Login, Auth interceptors, etc.
		my-shiny-new-articles/ # New module
		static-pages/	# Imprint, Contact and other pages
		users/			# Registration, Profile, etc.
	assets/	# Static assets like images, videos
	theme/	# Main theme, SASS tooling, application wide styles
```

## 3. Development

## 3.1 Environments
This Ionic project is set up to work with multiple environments, e.g. we have configured different API endpoints for each environment in the `constants.ts`. The default/fallback environment is `development`.

In this project hacking, production and staging are the same. Use production for production builds. development points to the mock server, as pointed out below.

```
# Points to hacking envirnoment, e.g. http://localhost:3000/
npm run start:hacking

# Both point to development environment, e.g. https://app-dev.example.com
npm start
npm run start:development
```

### 3.2 Run on devices
## Running and building the project

````
$ npm start                         // start local dev server to use app in the browser (ionic serve)
$ npm run start:hacking             // => APP_ENV=hacking ionic serve

$ npm run emulate:<ios|android>     // run app in the ios or android simulator
$ npm run emulate:<ios|android>:l   // run app in the ios or android simulator with live reload (automatically reloads app on code changes)

$ bin/test-build.sh                 // build both ios and android dev packages
````

Also see `scripts` in `package.json`.

*Pro tip*: If you have already built the app and want to run it on another Android device, use this command to install the APK.
```
adb install -r platforms/android/build/outputs/apk/debug/android-debug.apk
```

## 4. Known Issues
If in doubt, delete `node_modules`, `platforms` and `plugins`, then run
```
npm install
ionic cordova prepare
```

### App crashes on launch, Firebase is used for Push or Analytics
Check if `GoogleInfo.plist` in `platforms/ios` or `google-services.json` in `platforms/android` is empty. If yes, replace empty file with the one in project root.
