import { WebSocketServer } from 'ws';

function sendJson( socket , payload ) { 
    if ( socket.readyState === WebSocketServer.OPEN ) {
        socket.send( JSON.stringify( payload ) );
    } else { 
        return;
    }
}

function broadcast ( wss , payload ) {
    for( const client of wss.clients ) {
        if ( client.readyState === WebSocket.OPEN ) {
        client.send( JSON.stringify( payload ) );
    } else { 
        return; 
    }
    }
}

export function attachWebSocketServer ( server ) {
    const wss = new WebSocketServer( { server, path: '/ws', maxPayload: 1024 * 1024, });

    wss.on( 'connection' , ( socket ) => { 
        sendJson( socket, { type: 'welcome' } );
        
        socket.on('error' , console.error );
    });

    function broadcastMatchCreated ( match ) {
        broadcast( wss, { type: 'match_created' , data: match } );
    }

    return { broadcastMatchCreated };
}
