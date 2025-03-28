/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Todo } from './types/Todo';
import { TodoHeader } from './components/Todo/Header/Header';
import { TodoList } from './components/Todo/List/List';
import { ErrorMessageComponent } from './components/ErrorMessage/ErrorMessage';
import { TodoFooter } from './components/Todo/Footer/Footer';
import { FilterOption } from './types/FilterOptions';
import { ErrorType as ErrorMessage } from './types/ErrorTypes';
import { addTodo, deleteTodo, getTodos, USER_ID } from './api/todos';
import { NetworkStatus } from './types/AppNetworkStatus';
import { getInitialFilterFromHash } from './utils/getUrlHash';

const prepareTodos = (list: Todo[], filterBy: FilterOption) => {
  let copy = [...list];

  if (filterBy !== FilterOption.ALL) {
    copy = copy.filter(todo => {
      switch (filterBy) {
        case FilterOption.ACTIVE: {
          return !todo.completed;
        }

        case FilterOption.COMPLETED: {
          return todo.completed;
        }

        default: {
          return true;
        }
      }
    });
  }

  return copy;
};

export const App: React.FC = () => {
  // #region states
  const [filterBy, setFilterBy] = useState<FilterOption>(
    getInitialFilterFromHash(),
  );
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState(ErrorMessage.NO_ERROR);
  const [networkTodoStatus, setNetworkTodoStatus] = useState(
    NetworkStatus.Idle,
  );
  const [temporaryTodo, setTemporaryTodo] = useState<Todo | null>(null);

  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  // #endregion

  // #region handlers
  const handleFilterChange = useCallback((newType: FilterOption) => {
    setFilterBy(newType);
  }, []);

  const handleAddTodo = useCallback(async (todoTitle: string) => {
    const sanitizedTitle = todoTitle.trim();

    if (!sanitizedTitle) {
      setErrorMessage(ErrorMessage.EMPTY_TITLE);

      return;
    }

    const newTodo: Todo = {
      id: 0,
      title: sanitizedTitle,
      completed: false,
      userId: USER_ID,
    };

    setNetworkTodoStatus(NetworkStatus.Sending);
    setTemporaryTodo(newTodo);

    try {
      const response: Todo = await addTodo(newTodo);

      setTodos(current => [...current, response]);
      setNetworkTodoStatus(NetworkStatus.Idle);
    } catch (error) {
      setErrorMessage(ErrorMessage.FAIL_CREATING);
      setNetworkTodoStatus(NetworkStatus.Error);
    } finally {
      setTemporaryTodo(null);
    }
  }, []);

  const handleDeleteTodo = useCallback(async (id: number) => {
    setDeletingIds([id]);
    setNetworkTodoStatus(NetworkStatus.Deleting);

    try {
      await deleteTodo(id);
      setTodos(current => current.filter(todo => todo.id !== id));
    } catch (error) {
      setErrorMessage(ErrorMessage.FAIL_DELETING);
      setDeletingIds([]);
    }
  }, []);

  const handleDeleteCompleted = useCallback(async () => {
    const ids = todos.filter(todo => todo.completed).map(todo => todo.id);
    // works cool to delete messages in "parallel" without showing an error if individual deletion fails
    // const results = await Promise.allSettled(ids.map(id => deleteTodo(id)));
    // const successfulIds = ids.filter(
    //   (_, index) => results[index].status === 'fulfilled',
    // );
    // setTodos(current =>
    //   current.filter(todo => !successfulIds.includes(todo.id)),
    // );

    ids.forEach(handleDeleteTodo);
  }, [todos, handleDeleteTodo]);

  const handleClearError = useCallback(
    () => setErrorMessage(ErrorMessage.NO_ERROR),
    [],
  );
  // #endregion

  // #region useEffects
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const result = await getTodos();

        setTodos(result);
        setErrorMessage(ErrorMessage.NO_ERROR);
      } catch (error) {
        setErrorMessage(ErrorMessage.FAIL_LOADING);
      }
    };

    fetchTodos();
  }, []);

  // #endregion

  const visibleTodos = useMemo(
    () => prepareTodos(todos, filterBy),
    [todos, filterBy],
  );

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>
      <div className="todoapp__content">
        <TodoHeader
          todos={todos}
          onAddTodo={handleAddTodo}
          creationStatus={networkTodoStatus}
        />
        <TodoList
          todos={visibleTodos}
          deletedTodoIds={deletingIds}
          temporaryTodo={temporaryTodo}
          onTodoRemove={handleDeleteTodo}
        />
        {todos.length > 0 && (
          <TodoFooter
            filterBy={filterBy}
            onFilterChange={handleFilterChange}
            todos={todos}
            onDeleteCompleted={handleDeleteCompleted}
          />
        )}
      </div>

      <ErrorMessageComponent
        message={errorMessage}
        onErrorHide={handleClearError}
      />
    </div>
  );
};
