# swishlog

## API

```js
app.use(require('swishlog')); /* only in app.js */

var logger = require('swishlog').logger(__filename);
logger.debug('some message');
logger.error('some error');
```

## Winston Logging Levels

``` js
{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, /* silly: 5 */ }
```
