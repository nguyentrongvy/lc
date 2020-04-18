const { roomRepository } = require('../repositories');

class RoomService {
    getUnassignedRooms(lastRoom) {
        const condition = {
            $or: [
                {
                    agents: {
                        $size: 0,
                    }
                },
                { agents: null },
            ],
        };
        if (lastRoom) {
            condition._id = {
                $lt: lastRoom,
            };
        }
        return getRooms(condition);
    }

    getAssignedRooms({ lastRoom, agentId }) {
        const condition = {
            agents: {
                $ne: null,
                $size: {
                    $gte: 1, 
                },
                $elemMatch: {
                    _id: {
                        $ne: agentId,
                    }
                }
            }
        };
        if (lastRoom) {
            condition._id = {
                $lt: lastRoom,
            };
        }
        return getRooms(condition);
    }

    getOwnRooms({lastRoom, agentId}) {
        const condition = {
            'agents._id': agentId,
        };
        if (lastRoom) {
            condition._id = {
                $lt: lastRoom,
            };
        }
        return getRooms(condition);
    }
}

module.exports = new RoomService();

function getRooms(condition) {
    return roomRepository.getAll({
        where: condition,
        fields: 'botUser lastMessage channel',
        populate: {
            path: 'lastMessage',
            select: 'content createdAt botUser agent',
        },
        sort: {
            updatedAt: -1,
        },
    });
}
