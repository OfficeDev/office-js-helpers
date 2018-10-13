# Office JavaScript API: -Жок,

[! [Абалы Build] (https://travis-ci.org/OfficeDev/office-js-helpers.svg?branch=master)] (https://travis-ci.org/OfficeDev/office-js-helpers )
[! [КЭУБ чыгаруу] (https://badge.fury.io/js/%40microsoft%2Foffice-js-helpers.svg)] (https://www.npmjs.com/package/@microsoft/office-js -helpers)
[! [Көзкаранды] (https://david-dm.org/officedev/office-js-helpers.svg)] (https://david-dm.org/officedev/office-js-helpers)
[! [Жүктөмөлөр] (https://img.shields.io/npm/dt/@microsoft/office-js-helpers.svg)] (https://www.npmjs.com/package/@microsoft/office- JS-жардамчылары)

жардам жыйнагы Office кошуу-ин жана Microsoft командалар табулатура өнүктүрүүгө жөнөкөйлөтүү. Бул жардам сактоо башкаруу, аныктыгын, диалогдор жана башка пайдалуу коммуналдык сыяктуу өзгөчөлүктөрдү чечүү ж.б.

Учурдагы версия төмөнкү жардам камтыйт:
- [Authentication] (# тастыктоо)
- диалогдору
- Error Logging
- сактоо -Жок,
- Dictionary

> ** Сураныч белгиле @ casieber / @ маселелер боюнча Zlatkovsky **.

## Баштоо

### орнотуу

#### өнүктүрүү
> Бул сиз топтом менеджер катары УПМдин колдонуп жаткан болжолдойт.

туруктуу нускасын орнотуу үчүн:

`КЭУБ @ Текшерүү / иш-JS-helpers` --save орнотуу

#### Production

Сиз кирүү [unpkg бул Files] (https://unpkg.com/@microsoft/office-js-helpers@1.0.0/dist/office.helpers.min.js), аларды жүктөп, же топтом башкаруучусу көрсөтө алат аларга.

Ошондой эле [релиздерди] акыркы нускасын алууга болот (https://github.com/OfficeDev/office-js-helpers/releases) табулатура

## туттуу

### JavaScript

Office.js билэ аркылуу `.html` бетине ичинде кам- камсыз кылуу:
`` `HTML
<! - Office.js ->
<Скрипт УРА = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js"> </ жазуусу>

<! - сенин тандаган ES6 энени ->
<Скрипт УРА = "https://unpkg.com/core-js/client/core.min.js"> </ жазуусу>
`` `

Анда төмөнкүлөр ичинен бирин колдонуп жардам китепканасын маалымат:
`` `HTML
<! - Office JavaScript API: -Жок, (канада аркылуу) ->
<Скрипт УРА = "https://unpkg.com/@microsoft/office-js-helpers@1.0.0/dist/office.helpers.min.js"> </ жазуусу>

<! - Office JavaScript API Жардамчылары (КЭУБ аркылуу) ->
<Скрипт УРА = "node_modules/@microsoft/office-js-helpers/dist/office.helpers.min.js"> </ жазуусу>

<! - Office JavaScript API: -Жок, (жергиликтүү аркылуу) ->
<Скрипт УРА = "office.helpers.js"> </ жазуусу>
`` `

### басылган

** Эгер бир скрипт теги колдонуп китепкана адабиятты ** анда `кетүүгө үчүн tsconfig.json менен` node` үчүн moduleResolution` ко болсо IntelliSense жазуусу. Сиз темасы `аркылуу топтомун орнотуу Текшерүү / иш-JS-helpers` @ орнотуу үчүн керек болот.

> Биз жакында DefinitelyTyped жарыялоо жана анда түздөн-түз аныктамалар уруксат алуу үчүн `typings` колдоно аласыз.

** Эгер көз карандылыгы жүктөгүч колдонуп жаткан болсо ** сыяктуу [RequireJS] (http://requirejs.org/) же [SystemJS] (https://github.com/systemjs/systemjs) же модулу буу сыяктуу [катары browserify ] (http://browserify.org/), [webpack] (https://webpack.github.io/), сиз басылган `IMP колдоно аласыз
