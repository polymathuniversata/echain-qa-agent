import { UserService } from '../user-service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('getAllUsers', () => {
    it('should return all users', () => {
      const users = userService.getAllUsers();

      expect(users).toHaveLength(2);
      expect(users[0]).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  describe('getUserById', () => {
    it('should return user when found', () => {
      const user = userService.getUserById(1);

      expect(user).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should return undefined when user not found', () => {
      const user = userService.getUserById(999);

      expect(user).toBeUndefined();
    });
  });

  describe('addUser', () => {
    it('should add a new user and return it', () => {
      const newUser = userService.addUser({
        name: 'Bob Wilson',
        email: 'bob@example.com'
      });

      expect(newUser).toEqual({
        id: 3,
        name: 'Bob Wilson',
        email: 'bob@example.com'
      });

      const allUsers = userService.getAllUsers();
      expect(allUsers).toHaveLength(3);
    });
  });

  describe('formatUserName', () => {
    it('should capitalize the first letter', () => {
      const result = userService.formatUserName('john');

      expect(result).toBe('John');
    });
  });
});