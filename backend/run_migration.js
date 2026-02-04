
import { initDB } from './init_db.js';

initDB().then(() => {
    console.log('Migration run complete');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
