// Local browser harness only; not imported by production. All data/IDs are fictitious.
import React from 'react';import {createRoot} from 'react-dom/client';
import Feed,{useNbaStatPublicFeed} from '../../src/components/NbaStatPublicFeed.jsx';
import {publicDeliveryView} from '../../src/data/nbastat/public-delivery.js';
import {emptyNbaStatUpdates} from '../../src/data/nbastat/updates.js';
import {nbaStatFixture} from './nbastat.js';
function Fixture(){const feed=useNbaStatPublicFeed({enabled:true,testMode:true}),view=publicDeliveryView(emptyNbaStatUpdates(),feed.snapshot?.active,nbaStatFixture().mapping,{testMode:true});return <><Feed feed={feed} view={view}/><output aria-label="Actuaciones ficticias vinculadas">{Object.values(view.updates.games).reduce((n,g)=>n+g.records.length,0)}</output><output aria-label="Generación ficticia">{feed.snapshot?.active?.manifest.generation||0}</output></>;}
createRoot(document.getElementById('fixture')).render(<Fixture/>);
