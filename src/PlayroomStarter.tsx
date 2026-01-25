import { insertCoin, onPlayerJoin, me } from "playroomkit";
import { useEffect, useRef, memo } from "react";
import { usePlayroomStore } from "./playroomStore";


const PlayroomStarterInner = () => {
    const pendingPlayers = useRef([]);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const start = async () => {
            await insertCoin({ skipLobby: true });

            onPlayerJoin((state) => {
                if (state.id === me().id) return;

                usePlayroomStore.getState().addPlayer(state);
                console.log("Player joined", state);

                pendingPlayers.current.push(state);

                state.onQuit(() => {
                    console.log("Player left", state);
                    usePlayroomStore.getState().removePlayer(state);
                });
            });
        };

        start();
    }, []);

    //   useFrame(() => {
    //     if (!ref.current) return;


    //     while (pendingPlayers.current.length > 0) {
    //       const playerState = pendingPlayers.current.shift();
    //       ref.current.addInstances(1, (obj) => {
    //         obj.position.set(0, 2, 0);
    //         obj.playerId = playerState.id;
    //         obj.playerState = playerState;
    //         obj.scale.set(2, 2, 2);
    //         playerInstanceMap.current.set(playerState.id, obj);
    //         console.log("Instance created for player", playerState.id);
    //       });
    //     }

    //     ref.current.updateInstances((obj) => {
    //       const pos = obj.playerState?.state?.position;
    //       if (pos && pos.x !== undefined && pos.y !== undefined && pos.z !== undefined) {
    //         obj.position.set(pos.x, pos.y, pos.z);
    //       }
    //     });
    //   });
    return null
};

export const PlayroomStarter = memo(PlayroomStarterInner);