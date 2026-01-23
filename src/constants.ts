import EventEmitter from "eventemitter3";

export const eventBus = new EventEmitter();

export const EVENTS = {
    PLAYER_HIT: 'playerHit',
    ENEMY_HIT: 'enemyHit',
    ENEMY_DEAD: 'enemyDead',
    ENEMY_SPAWN: 'enemySpawn',
    ENEMY_ATTACK: 'enemyAttack',
    ENEMY_DAMAGE: 'enemyDamage',
    ENEMY_KNOCKBACK: 'enemyKnockback',
    CAMERA_SHAKE: 'cameraShake',
    ATTACK_END: 'attackEnd',
    WAVE_START: 'waveStart',
    WAVE_COMPLETE: 'waveComplete',
}